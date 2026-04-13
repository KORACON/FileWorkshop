import {
  Controller, Post, Get, Param, Body, Req, Res,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles,
  BadRequestException, StreamableFile, Header,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';
import { UploadFileDto } from './dto/upload-file.dto';
import { FILE_LIMITS } from '../../common/constants/file-limits';

/**
 * Multer disk storage — файлы сохраняются сразу в temp директорию
 * с безопасными UUID-именами. Оригинальное имя НИКОГДА не используется в путях.
 */
function createMulterStorage(tempDir: string) {
  return diskStorage({
    destination: tempDir,
    filename: (_req, file, cb) => {
      // Санитизируем расширение
      let ext = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      if (!ext || ext === '.') ext = '.bin';
      if (ext.length > 10) ext = ext.substring(0, 10);
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

@Controller('files')
export class FilesController {
  private readonly tempDir: string;

  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {
    this.tempDir = this.configService.get<string>('storage.tempDir')!;
  }

  /**
   * POST /api/files/upload
   * Загрузка одного файла + создание задачи на обработку.
   *
   * Rate limit: 10 загрузок в минуту.
   * Multer сохраняет файл в temp/ с UUID-именем.
   * Затем FilesService валидирует, перемещает в original/ и создаёт job.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: FILE_LIMITS.MAX_FILE_SIZE,
      files: 1,
    },
    // Storage настраивается динамически в module
  }))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Файл не загружен');
    return this.filesService.uploadSingle(file, dto, user, req);
  }

  /**
   * POST /api/files/upload-multiple
   * Загрузка нескольких файлов для пакетных операций.
   * Максимум 20 файлов за раз.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', FILE_LIMITS.MAX_FILES_PER_REQUEST, {
    limits: {
      fileSize: FILE_LIMITS.MAX_FILE_SIZE,
    },
  }))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFileDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не загружены');
    }
    return this.filesService.uploadMultiple(files, dto, user, req);
  }

  /**
   * GET /api/files/:jobId/download
   * Скачивание результата обработки.
   *
   * Файл отдаётся ТОЛЬКО через backend с проверкой:
   * - пользователь авторизован
   * - задача принадлежит пользователю
   * - задача завершена (status = DONE)
   * - файл существует на диске
   *
   * Прямого доступа к storage через Nginx НЕТ.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get(':jobId/download')
  async download(
    @Param('jobId') jobId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      await this.filesService.download(jobId, user, res);
    } catch (err: any) {
      const status = err.status || err.getStatus?.() || 500;
      const message = err.message || 'Ошибка скачивания';
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message, statusCode: status } });
      }
    }
  }

  /**
   * GET /api/files/:jobId/download-original
   * Скачивание оригинального файла (до обработки).
   * Полезно для повторной обработки с другими параметрами.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':jobId/download-original')
  async downloadOriginal(
    @Param('jobId') jobId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      await this.filesService.downloadOriginal(jobId, user, res);
    } catch (err: any) {
      const status = err.status || err.getStatus?.() || 500;
      const message = err.message || 'Ошибка скачивания';
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message, statusCode: status } });
      }
    }
  }
}
