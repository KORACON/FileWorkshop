import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileJob, JobStatus, Prisma } from '@prisma/client';

// ──────────────────────────────────────────────
// Типы
// ──────────────────────────────────────────────

export interface CreateJobInput {
  userId?: string;
  originalFilename: string;
  storedOriginalPath: string;
  mimeType: string;
  fileSizeBefore: number;
  operationType: string;
  sourceFormat: string;
  targetFormat?: string;
  options?: Record<string, string>;
}

export interface JobWithOptions extends FileJob {
  options: Array<{ id: string; fileJobId: string; optionKey: string; optionValue: string }>;
}

export interface CompleteJobInput {
  outputFilename: string;
  storedOutputPath: string;
  fileSizeAfter: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // СОЗДАНИЕ ЗАДАЧИ (вызывается из FilesService)
  // ──────────────────────────────────────────────

  async create(input: CreateJobInput): Promise<FileJob> {
    const job = await this.prisma.fileJob.create({
      data: {
        userId: input.userId,
        originalFilename: input.originalFilename,
        storedOriginalPath: input.storedOriginalPath,
        mimeType: input.mimeType,
        fileSizeBefore: BigInt(input.fileSizeBefore),
        operationType: input.operationType,
        sourceFormat: input.sourceFormat,
        targetFormat: input.targetFormat,
        status: 'QUEUED',
        expiresAt: input.userId
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // 7 дней для зарегистрированных
          : new Date(Date.now() + 24 * 60 * 60 * 1000),       // 24 часа для анонимных
        options: input.options
          ? {
              create: Object.entries(input.options).map(([key, value]) => ({
                optionKey: key,
                optionValue: String(value),
              })),
            }
          : undefined,
      },
      include: { options: true },
    });

    this.logger.log(`Job ${job.id} создан: ${input.operationType} [${input.sourceFormat}→${input.targetFormat || 'same'}]`);
    return job;
  }

  // ──────────────────────────────────────────────
  // ЧТЕНИЕ
  // ──────────────────────────────────────────────

  async findById(id: string): Promise<JobWithOptions | null> {
    return this.prisma.fileJob.findUnique({
      where: { id },
      include: { options: true },
    });
  }

  // ──────────────────────────────────────────────
  // WORKER: ЗАХВАТ ЗАДАЧИ
  // ──────────────────────────────────────────────

  /**
   * Атомарно захватывает следующую задачу из очереди.
   *
   * Использует SELECT ... FOR UPDATE SKIP LOCKED:
   * - FOR UPDATE: блокирует строку для других транзакций
   * - SKIP LOCKED: пропускает уже заблокированные строки (другим worker-ом)
   *
   * Это гарантирует, что два worker-а НИКОГДА не возьмут одну задачу.
   * При масштабировании на N worker-ов — работает без изменений.
   *
   * Порядок: priority DESC (платные первые), created_at ASC (FIFO).
   */
  async acquireNext(workerId: string): Promise<JobWithOptions | null> {
    // Атомарный UPDATE + RETURNING через raw SQL
    const jobs = await this.prisma.$queryRaw<FileJob[]>`
      UPDATE file_jobs
      SET
        status = 'PROCESSING',
        locked_at = NOW(),
        locked_by = ${workerId},
        started_at = NOW()
      WHERE id = (
        SELECT id FROM file_jobs
        WHERE status = 'QUEUED'
          AND (deleted_at IS NULL)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (!jobs[0]) return null;

    // Подгружаем options отдельно (raw query не делает JOIN)
    const options = await this.prisma.jobOption.findMany({
      where: { fileJobId: jobs[0].id },
    });

    return { ...jobs[0], options } as JobWithOptions;
  }

  // ──────────────────────────────────────────────
  // WORKER: ОБНОВЛЕНИЕ СТАТУСА
  // ──────────────────────────────────────────────

  /** Задача успешно завершена */
  async completeJob(id: string, result: CompleteJobInput): Promise<FileJob> {
    const job = await this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'DONE',
        outputFilename: result.outputFilename,
        storedOutputPath: result.storedOutputPath,
        fileSizeAfter: BigInt(result.fileSizeAfter),
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });

    this.logger.log(
      `Job ${id} завершён: ${Number(job.fileSizeBefore)} → ${result.fileSizeAfter} bytes`,
    );
    return job;
  }

  /** Задача завершилась с ошибкой */
  async failJob(id: string, errorMessage: string): Promise<FileJob> {
    const job = await this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'ERROR',
        errorMessage: errorMessage.substring(0, 2000), // Ограничиваем длину
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });

    this.logger.error(`Job ${id} ошибка: ${errorMessage}`);
    return job;
  }

  /**
   * Задача вернулась в очередь для повторной попытки.
   * Инкрементирует retry_count. Если превышен max_retries — ставит ERROR.
   */
  async retryOrFail(id: string, errorMessage: string): Promise<FileJob> {
    const job = await this.prisma.fileJob.findUnique({ where: { id } });
    if (!job) throw new Error(`Job ${id} не найден`);

    if (job.retryCount + 1 >= job.maxRetries) {
      return this.failJob(id, `Превышено максимальное количество попыток (${job.maxRetries}). Последняя ошибка: ${errorMessage}`);
    }

    const updated = await this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'QUEUED',
        retryCount: { increment: 1 },
        errorMessage: `Попытка ${job.retryCount + 1}: ${errorMessage}`,
        lockedAt: null,
        lockedBy: null,
        startedAt: null,
      },
    });

    this.logger.warn(`Job ${id} retry ${updated.retryCount}/${job.maxRetries}: ${errorMessage}`);
    return updated;
  }

  /** Отмена задачи пользователем */
  async cancelJob(id: string, userId: string): Promise<FileJob | null> {
    const job = await this.prisma.fileJob.findUnique({ where: { id } });
    if (!job || job.userId !== userId) return null;

    // Можно отменить только QUEUED задачи
    if (job.status !== 'QUEUED') return null;

    return this.prisma.fileJob.update({
      where: { id },
      data: {
        status: 'CANCELED',
        completedAt: new Date(),
      },
    });
  }

  // ──────────────────────────────────────────────
  // STALE JOB RECOVERY
  // ──────────────────────────────────────────────

  /**
   * Возвращает зависшие задачи в очередь.
   *
   * Задача считается зависшей если:
   * - status = PROCESSING
   * - locked_at < NOW() - timeout
   * - retry_count < max_retries
   *
   * Вызывается cron-задачей каждые 5 минут.
   * Также вызывается worker-ом при старте.
   */
  async releaseStaleJobs(timeoutMinutes: number = 10): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    // Используем raw SQL чтобы сравнить retry_count < max_retries
    const result = await this.prisma.$executeRaw`
      UPDATE file_jobs
      SET
        status = 'QUEUED',
        locked_at = NULL,
        locked_by = NULL,
        retry_count = retry_count + 1,
        error_message = 'Задача зависла (timeout), возвращена в очередь'
      WHERE status = 'PROCESSING'
        AND locked_at < ${cutoff}
        AND retry_count < max_retries
    `;

    // Задачи, превысившие max_retries — помечаем как ERROR
    const failedResult = await this.prisma.$executeRaw`
      UPDATE file_jobs
      SET
        status = 'ERROR',
        locked_at = NULL,
        locked_by = NULL,
        completed_at = NOW(),
        error_message = 'Задача зависла и превысила максимальное количество попыток'
      WHERE status = 'PROCESSING'
        AND locked_at < ${cutoff}
        AND retry_count >= max_retries
    `;

    if (result > 0) this.logger.warn(`Возвращено ${result} зависших задач в очередь`);
    if (failedResult > 0) this.logger.error(`${failedResult} задач помечены как ERROR (превышен retry limit)`);

    return result + failedResult;
  }

  // ──────────────────────────────────────────────
  // СТАТИСТИКА (для health check и мониторинга)
  // ──────────────────────────────────────────────

  async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    done: number;
    error: number;
    canceled: number;
  }> {
    const counts = await this.prisma.fileJob.groupBy({
      by: ['status'],
      _count: true,
      where: { deletedAt: null },
    });

    const stats = { queued: 0, processing: 0, done: 0, error: 0, canceled: 0 };
    for (const row of counts) {
      const key = row.status.toLowerCase() as keyof typeof stats;
      if (key in stats) stats[key] = row._count;
    }
    return stats;
  }
}
