import { PrismaClient, FileJob } from '@prisma/client';
import { HandlerRegistry, JobContext, JobResult } from './handler-registry';
import { WorkerConfig } from './worker-config';

/**
 * Основной цикл worker-а.
 *
 * Стратегия polling:
 * - Очередь пуста → ждём pollIntervalMs (3 сек)
 * - Есть задачи → ждём pollIntervalBusyMs (500 мс) — быстрее подхватываем
 * - Ошибка БД → exponential backoff до 30 сек
 *
 * Concurrency:
 * - Поддерживает N параллельных задач (по умолчанию 2)
 * - Каждая задача — отдельный Promise
 * - acquireNext с FOR UPDATE SKIP LOCKED гарантирует уникальность
 */
export class WorkerLoop {
  private running = false;
  private activeJobs = 0;
  private currentJobPromises: Promise<void>[] = [];
  private backoffMs = 0;
  private readonly maxBackoffMs = 30000;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly registry: HandlerRegistry,
    private readonly config: WorkerConfig,
    private readonly workerId: string,
  ) {}

  async start() {
    this.running = true;
    this.log('Polling loop запущен');
    this.log(`Concurrency: ${this.config.concurrency}, Poll: ${this.config.pollIntervalMs}ms, Timeout: ${this.config.jobTimeoutMs}ms`);

    while (this.running) {
      try {
        // Если есть свободные слоты — пытаемся взять задачу
        if (this.activeJobs < this.config.concurrency) {
          const job = await this.acquireJob();

          if (job) {
            this.backoffMs = 0; // Сбрасываем backoff
            this.activeJobs++;

            // Запускаем обработку в фоне (не блокируем loop)
            const promise = this.processJob(job)
              .finally(() => { this.activeJobs--; });
            this.currentJobPromises.push(promise);

            // Быстрый poll — может быть ещё задачи
            await this.sleep(this.config.pollIntervalBusyMs);
            continue;
          }
        }

        // Нет задач или все слоты заняты — обычный интервал
        await this.sleep(this.config.pollIntervalMs);

      } catch (err) {
        // Ошибка подключения к БД — exponential backoff
        this.backoffMs = Math.min(this.backoffMs * 2 || 1000, this.maxBackoffMs);
        this.error(`Ошибка polling: ${err}. Backoff: ${this.backoffMs}ms`);
        await this.sleep(this.backoffMs);
      }
    }

    this.log('Polling loop остановлен');
  }

  stop() {
    this.running = false;
  }

  /** Ожидание завершения текущих задач */
  async waitForCurrentJob(timeoutMs: number) {
    if (this.currentJobPromises.length === 0) return;

    this.log(`Ожидание завершения ${this.currentJobPromises.length} задач...`);
    await Promise.race([
      Promise.allSettled(this.currentJobPromises),
      this.sleep(timeoutMs),
    ]);
  }

  /** Восстановление зависших задач при старте worker-а */
  async recoverStaleJobs() {
    const cutoff = new Date(Date.now() - this.config.staleTimeoutMinutes * 60 * 1000);

    // Возвращаем в очередь задачи с retry_count < max_retries
    const recovered = await this.prisma.$executeRaw`
      UPDATE file_jobs
      SET
        status = 'QUEUED',
        locked_at = NULL,
        locked_by = NULL,
        retry_count = retry_count + 1,
        error_message = 'Worker restart: задача возвращена в очередь'
      WHERE status = 'PROCESSING'
        AND locked_at < ${cutoff}
        AND retry_count < max_retries
    `;

    // Помечаем как ERROR задачи, превысившие лимит
    const failed = await this.prisma.$executeRaw`
      UPDATE file_jobs
      SET
        status = 'ERROR',
        locked_at = NULL,
        locked_by = NULL,
        completed_at = NOW(),
        error_message = 'Задача зависла и превысила лимит повторов'
      WHERE status = 'PROCESSING'
        AND locked_at < ${cutoff}
        AND retry_count >= max_retries
    `;

    if (recovered > 0) this.warn(`Восстановлено ${recovered} зависших задач`);
    if (failed > 0) this.error(`${failed} задач помечены как ERROR`);
  }

  // ──────────────────────────────────────────────
  // ЗАХВАТ И ОБРАБОТКА ЗАДАЧИ
  // ──────────────────────────────────────────────

  private async acquireJob(): Promise<JobWithOptions | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      UPDATE file_jobs
      SET
        status = 'PROCESSING',
        locked_at = NOW(),
        locked_by = ${this.workerId},
        started_at = NOW()
      WHERE id = (
        SELECT id FROM file_jobs
        WHERE status = 'QUEUED'
          AND deleted_at IS NULL
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (!rows[0]) return null;

    // Raw query возвращает snake_case — маппим в camelCase
    const raw = rows[0];
    const job: any = {
      id: raw.id,
      userId: raw.user_id,
      originalFilename: raw.original_filename,
      storedOriginalPath: raw.stored_original_path,
      outputFilename: raw.output_filename,
      storedOutputPath: raw.stored_output_path,
      mimeType: raw.mime_type,
      fileSizeBefore: raw.file_size_before,
      fileSizeAfter: raw.file_size_after,
      operationType: raw.operation_type,
      sourceFormat: raw.source_format,
      targetFormat: raw.target_format,
      status: raw.status,
      errorMessage: raw.error_message,
      retryCount: raw.retry_count,
      maxRetries: raw.max_retries,
      priority: raw.priority,
      lockedAt: raw.locked_at,
      lockedBy: raw.locked_by,
      createdAt: raw.created_at,
      startedAt: raw.started_at,
      completedAt: raw.completed_at,
      expiresAt: raw.expires_at,
      deletedAt: raw.deleted_at,
    };

    const options = await this.prisma.jobOption.findMany({
      where: { fileJobId: job.id },
    });

    return { ...job, options } as JobWithOptions;
  }

  private async processJob(job: JobWithOptions): Promise<void> {
    const startTime = Date.now();
    this.log(`Обработка job ${job.id}: ${job.operationType} [${job.sourceFormat}→${job.targetFormat || 'same'}]`);

    try {
      // Собираем контекст для handler-а
      const context: JobContext = {
        job,
        options: Object.fromEntries(
          job.options.map((o) => [o.optionKey, o.optionValue]),
        ),
        storageDirs: this.config.storageDirs,
      };
      this.log(`Job ${job.id} options: ${JSON.stringify(context.options)}`);

      // Находим handler по operationType
      const handler = this.registry.getHandler(job.operationType);
      if (!handler) {
        await this.failJob(job.id, `Неизвестный тип операции: ${job.operationType}`);
        return;
      }

      // Запускаем с таймаутом
      const result = await this.withTimeout(
        handler(context),
        this.config.jobTimeoutMs,
        `Таймаут обработки (${this.config.jobTimeoutMs / 1000}с)`,
      );

      // Успех
      await this.completeJob(job.id, result);

      const duration = Date.now() - startTime;
      this.log(
        `Job ${job.id} завершён за ${duration}ms: ${Number(job.fileSizeBefore)} → ${result.fileSizeAfter} bytes`,
      );

    } catch (err: any) {
      const duration = Date.now() - startTime;
      const errorMsg = err.message || String(err);
      this.error(`Job ${job.id} ошибка за ${duration}ms: ${errorMsg}`);

      // Retry или финальная ошибка
      await this.retryOrFail(job.id, job.retryCount, job.maxRetries, errorMsg);
    }
  }

  // ──────────────────────────────────────────────
  // ОБНОВЛЕНИЕ СТАТУСА В БД
  // ──────────────────────────────────────────────

  private async completeJob(id: string, result: JobResult): Promise<void> {
    await this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'DONE',
        outputFilename: result.outputFilename,
        storedOutputPath: result.storedOutputPath,
        fileSizeAfter: BigInt(result.fileSizeAfter),
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        errorMessage: null,
      },
    });
  }

  private async failJob(id: string, errorMessage: string): Promise<void> {
    await this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'ERROR',
        errorMessage: errorMessage.substring(0, 2000),
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  private async retryOrFail(
    id: string,
    currentRetry: number,
    maxRetries: number,
    errorMessage: string,
  ): Promise<void> {
    if (currentRetry + 1 >= maxRetries) {
      await this.failJob(id, `Превышен лимит попыток (${maxRetries}). Последняя ошибка: ${errorMessage}`);
      return;
    }

    await this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'QUEUED',
        retryCount: { increment: 1 },
        errorMessage: `Попытка ${currentRetry + 1}: ${errorMessage}`,
        lockedAt: null,
        lockedBy: null,
        startedAt: null,
      },
    });

    this.warn(`Job ${id} retry ${currentRetry + 1}/${maxRetries}`);
  }

  // ──────────────────────────────────────────────
  // УТИЛИТЫ
  // ──────────────────────────────────────────────

  /** Таймаут для обработки задачи */
  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then((result) => { clearTimeout(timer); resolve(result); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(msg: string) { console.log(`[${this.ts()}] [${this.workerId}] ${msg}`); }
  private warn(msg: string) { console.warn(`[${this.ts()}] [${this.workerId}] WARN: ${msg}`); }
  private error(msg: string) { console.error(`[${this.ts()}] [${this.workerId}] ERROR: ${msg}`); }
  private ts(): string { return new Date().toISOString(); }
}

// Тип для задачи с опциями
interface JobWithOptions extends FileJob {
  options: Array<{ id: string; fileJobId: string; optionKey: string; optionValue: string }>;
}
