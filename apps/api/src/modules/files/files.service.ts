import {
  Injectable, BadRequestException, NotFoundException,
  ForbiddenException, Logger, PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { basename, extname } from 'path';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';
import { ALL_ALLOWED_MIME_TYPES } from '../../common/constants/mime-types';
import { FILE_LIMITS } from '../../common/constants/file-limits';
import { validateMimeType } from './utils/mime-validator';
import { extractFormat, generateOutputFilename } from './utils/filename-sanitizer';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly storageService: StorageService,
    private readonly jobsService: JobsService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {
    const maxMb = this.configService.get<number>('storage.maxFileSizeMb', 50);
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
  }

  // ──────────────────────────────────────────────
  // ЗАГРУЗКА ОДНОГО ФАЙЛА
  // ──────────────────────────────────────────────

  async uploadSingle(
    file: Express.Multer.File,
    dto: UploadFileDto,
    user: RequestUser,
    req: Request,
  ) {
    // 1. Валидация файла
    await this.validateFile(file);

    // 2. Multer уже сохранил файл в temp/ с UUID-именем
    //    file.path = /storage/temp/uuid.ext
    const safeName = basename(file.path);

    // 3. Перемещаем из temp → original
    const originalPath = await this.storageService.moveFile(
      file.path, 'original', safeName,
    );

    // 4. Определяем формат
    const sourceFormat = extractFormat(file.originalname);

    // 5. Создаём задачу
    const job = await this.jobsService.create({
      userId: user.id,
      originalFilename: file.originalname,
      storedOriginalPath: originalPath,
      mimeType: file.mimetype,
      fileSizeBefore: file.size,
      operationType: dto.operationType,
      sourceFormat,
      targetFormat: dto.targetFormat,
      options: dto.options,
    });

    // 6. Аудит
    await this.auditLogService.log({
      action: 'upload',
      userId: user.id,
      entityType: 'file_job',
      entityId: job.id,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: {
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        operationType: dto.operationType,
      },
    });

    this.logger.log(
      `Upload: ${file.originalname} (${this.formatSize(file.size)}) → job ${job.id} [${dto.operationType}]`,
    );

    return {
      jobId: job.id,
      status: job.status,
      originalFilename: file.originalname,
      fileSize: file.size,
      operationType: dto.operationType,
    };
  }

  // ──────────────────────────────────────────────
  // ЗАГРУЗКА НЕСКОЛЬКИХ ФАЙЛОВ
  // ──────────────────────────────────────────────

  async uploadMultiple(
    files: Express.Multer.File[],
    dto: UploadFileDto,
    user: RequestUser,
    req: Request,
  ) {
    if (files.length > FILE_LIMITS.MAX_FILES_PER_REQUEST) {
      // Удаляем уже загруженные файлы из temp
      await this.cleanupTempFiles(files);
      throw new BadRequestException(
        `Максимум ${FILE_LIMITS.MAX_FILES_PER_REQUEST} файлов за раз`,
      );
    }

    const results: Array<{
      jobId: string;
      status: string;
      originalFilename: string;
      fileSize: number;
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        await this.validateFile(file);

        const safeName = basename(file.path);
        const originalPath = await this.storageService.moveFile(
          file.path, 'original', safeName,
        );

        const sourceFormat = extractFormat(file.originalname);

        const job = await this.jobsService.create({
          userId: user.id,
          originalFilename: file.originalname,
          storedOriginalPath: originalPath,
          mimeType: file.mimetype,
          fileSizeBefore: file.size,
          operationType: dto.operationType,
          sourceFormat,
          targetFormat: dto.targetFormat,
          options: dto.options,
        });

        results.push({
          jobId: job.id,
          status: job.status,
          originalFilename: file.originalname,
          fileSize: file.size,
        });
      } catch (err: any) {
        // Один файл не прошёл валидацию — не блокируем остальные
        this.logger.warn(`Ошибка загрузки ${file.originalname}: ${err.message}`);
        // Удаляем файл из temp если он ещё там
        await this.storageService.deleteFile(file.path).catch(() => {});

        results.push({
          jobId: '',
          status: 'ERROR',
          originalFilename: file.originalname,
          fileSize: file.size,
          error: err.message,
        });
      }
    }

    await this.auditLogService.log({
      action: 'upload_batch',
      userId: user.id,
      ipAddress: this.getClientIp(req),
      metadata: {
        totalFiles: files.length,
        successCount: results.filter((r) => r.status !== 'ERROR').length,
        operationType: dto.operationType,
      },
    });

    return {
      total: results.length,
      successful: results.filter((r) => r.status !== 'ERROR').length,
      failed: results.filter((r) => r.status === 'ERROR').length,
      results,
    };
  }

  // ──────────────────────────────────────────────
  // СКАЧИВАНИЕ РЕЗУЛЬТАТА
  // ──────────────────────────────────────────────

  async download(jobId: string, user: RequestUser, res: Response) {
    const job = await this.jobsService.findById(jobId);

    // Проверки доступа
    if (!job) throw new NotFoundException('Задача не найдена');
    if (job.userId !== user.id) throw new ForbiddenException('Нет доступа к этому файлу');
    if (job.status !== 'DONE') {
      throw new BadRequestException(
        job.status === 'ERROR'
          ? `Обработка завершилась с ошибкой: ${job.errorMessage || 'неизвестная ошибка'}`
          : 'Файл ещё обрабатывается',
      );
    }
    if (!job.storedOutputPath) {
      throw new BadRequestException('Файл результата не найден');
    }

    // Проверяем, что файл существует на диске
    const exists = await this.storageService.fileExists(job.storedOutputPath);
    if (!exists) {
      this.logger.error(`Файл результата не найден на диске: ${job.storedOutputPath} (job: ${jobId})`);
      throw new NotFoundException('Файл результата удалён или недоступен');
    }

    // Определяем имя для скачивания
    const downloadFilename = job.outputFilename
      || generateOutputFilename(job.originalFilename, job.targetFormat || undefined, job.operationType);

    // Определяем Content-Type
    const contentType = this.getContentType(downloadFilename, job.targetFormat);

    // Размер файла для Content-Length
    const fileSize = await this.storageService.getFileSize(job.storedOutputPath);

    // Отдаём файл потоком
    const stream = await this.storageService.getReadStream(job.storedOutputPath);

    res.set({
      'Content-Type': contentType,
      'Content-Length': String(fileSize),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFilename)}"; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`,
      'Cache-Control': 'private, no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    stream.pipe(res);

    // Логируем скачивание
    await this.auditLogService.log({
      action: 'download',
      userId: user.id,
      entityType: 'file_job',
      entityId: jobId,
    });
  }

  /**
   * Скачивание оригинального файла.
   */
  async downloadOriginal(jobId: string, user: RequestUser, res: Response) {
    const job = await this.jobsService.findById(jobId);

    if (!job) throw new NotFoundException('Задача не найдена');
    if (job.userId !== user.id) throw new ForbiddenException('Нет доступа');
    if (!job.storedOriginalPath) throw new NotFoundException('Оригинальный файл не найден');

    const exists = await this.storageService.fileExists(job.storedOriginalPath);
    if (!exists) throw new NotFoundException('Оригинальный файл удалён');

    const fileSize = await this.storageService.getFileSize(job.storedOriginalPath);
    const stream = await this.storageService.getReadStream(job.storedOriginalPath);

    res.set({
      'Content-Type': job.mimeType || 'application/octet-stream',
      'Content-Length': String(fileSize),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(job.originalFilename)}"; filename*=UTF-8''${encodeURIComponent(job.originalFilename)}`,
      'Cache-Control': 'private, no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    stream.pipe(res);
  }

  // ──────────────────────────────────────────────
  // ВАЛИДАЦИЯ ФАЙЛА
  // ──────────────────────────────────────────────

  /**
   * Комплексная валидация загруженного файла:
   * 1. Размер
   * 2. Расширение (whitelist)
   * 3. MIME-тип (whitelist)
   * 4. Реальный MIME через magic bytes
   */
  private async validateFile(file: Express.Multer.File): Promise<void> {
    // 1. Размер
    if (file.size > this.maxFileSizeBytes) {
      throw new PayloadTooLargeException(
        `Файл слишком большой (${this.formatSize(file.size)}). Максимум: ${this.formatSize(this.maxFileSizeBytes)}`,
      );
    }

    if (file.size === 0) {
      throw new BadRequestException('Файл пустой');
    }

    // 2. Расширение
    const ext = extname(file.originalname).toLowerCase();
    if (!FILE_LIMITS.ALLOWED_EXTENSIONS.includes(ext as any)) {
      throw new BadRequestException(
        `Расширение ${ext} не поддерживается. Допустимые: ${FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // 3. MIME-тип из Content-Type
    if (!ALL_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(`Тип файла ${file.mimetype} не поддерживается`);
    }

    // 4. Проверка реального MIME через magic bytes
    //    Читаем первые 32 байта файла (Multer уже сохранил на диск)
    try {
      const { readFile: readFileAsync } = await import('fs/promises');
      const fd = await import('fs');
      const handle = await readFileAsync(file.path, { flag: 'r' });
      const header = handle.slice(0, 64); // Первые 64 байта для magic bytes

      const result = validateMimeType(header, file.mimetype, file.originalname);
      if (!result.valid) {
        this.logger.warn(
          `MIME mismatch: ${file.originalname} — ${result.reason}`,
        );
        // Перемещаем в карантин
        await this.storageService.moveFile(file.path, 'quarantine', basename(file.path));
        throw new BadRequestException(
          'Содержимое файла не соответствует заявленному типу',
        );
      }
    } catch (err: any) {
      // Если ошибка уже BadRequestException — пробрасываем
      if (err instanceof BadRequestException) throw err;
      // Иначе — логируем, но не блокируем (magic bytes проверка — дополнительная)
      this.logger.warn(`Не удалось проверить magic bytes для ${file.originalname}: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────
  // УТИЛИТЫ
  // ──────────────────────────────────────────────

  /** Определяет Content-Type для скачивания */
  private getContentType(filename: string, targetFormat?: string | null): string {
    const ext = targetFormat ? `.${targetFormat}` : extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.odt': 'application/vnd.oasis.opendocument.text',
      '.rtf': 'application/rtf',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.md': 'text/markdown',
      '.zip': 'application/zip',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  /** Форматирует размер файла для логов и сообщений */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Извлекает IP клиента */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /** Удаляет временные файлы при ошибке batch upload */
  private async cleanupTempFiles(files: Express.Multer.File[]): Promise<void> {
    for (const file of files) {
      if (file.path) {
        await this.storageService.deleteFile(file.path).catch(() => {});
      }
    }
  }
}
