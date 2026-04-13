import { PipeTransform, Injectable, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { ALL_ALLOWED_MIME_TYPES } from '../../../common/constants/mime-types';
import { FILE_LIMITS } from '../../../common/constants/file-limits';
import { extname } from 'path';

/**
 * Pipe для валидации загруженного файла.
 * Используется как дополнительная проверка в контроллере:
 * @UploadedFile(new FileValidationPipe()) file: Express.Multer.File
 *
 * Основная валидация (включая magic bytes) выполняется в FilesService.
 * Этот pipe — быстрая предварительная проверка.
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл обязателен');
    }

    // Пустой файл
    if (file.size === 0) {
      throw new BadRequestException('Файл пустой');
    }

    // Размер
    if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(
        `Файл слишком большой. Максимум: ${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024} МБ`,
      );
    }

    // MIME-тип из Content-Type header
    if (!ALL_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(`Тип файла ${file.mimetype} не поддерживается`);
    }

    // Расширение
    const ext = extname(file.originalname).toLowerCase();
    if (!FILE_LIMITS.ALLOWED_EXTENSIONS.includes(ext as any)) {
      throw new BadRequestException(`Расширение ${ext} не поддерживается`);
    }

    // Проверка на null bytes в имени файла (path traversal attempt)
    if (file.originalname.includes('\x00')) {
      throw new BadRequestException('Недопустимое имя файла');
    }

    return file;
  }
}
