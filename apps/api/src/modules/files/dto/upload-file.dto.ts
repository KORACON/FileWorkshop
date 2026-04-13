import { IsString, IsOptional, IsObject, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadFileDto {
  /**
   * Тип операции в формате "категория.действие":
   * - image.convert, image.resize, image.compress, image.rotate, image.remove_exif
   * - pdf.merge, pdf.split, pdf.compress, pdf.rotate, pdf.extract_pages, pdf.to_images, pdf.from_images
   * - doc.convert
   * - util.zip, util.unzip, util.rename
   */
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z]+\.[a-z_]+$/, {
    message: 'operationType должен быть в формате "категория.действие" (например image.convert)',
  })
  operationType: string;

  /**
   * Целевой формат (без точки): png, jpg, pdf, docx и т.д.
   * Необязателен для операций без смены формата (compress, rotate).
   */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[a-z0-9]+$/, {
    message: 'targetFormat должен содержать только буквы и цифры (например png, jpg, pdf)',
  })
  targetFormat?: string;

  /**
   * Дополнительные параметры операции.
   * Передаются как JSON-строка в multipart form, парсятся через Transform.
   *
   * Примеры:
   * - { "quality": "80" }
   * - { "width": "800", "height": "600" }
   * - { "pages": "1,3,5-7" }
   * - { "rotation": "90" }
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  })
  @IsObject()
  options?: Record<string, string>;
}
