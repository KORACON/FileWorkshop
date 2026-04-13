import { extname } from 'path';

/**
 * Маппинг MIME → расширение.
 * Используется как fallback, если расширение из оригинального имени невалидно.
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/rtf': '.rtf',
  'text/rtf': '.rtf',
  'text/plain': '.txt',
  'text/html': '.html',
  'text/markdown': '.md',
  'application/zip': '.zip',
};

/**
 * Маппинг расширение → MIME.
 * Используется для определения source format.
 */
export const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.md': 'text/markdown',
  '.zip': 'application/zip',
};

/**
 * Извлекает расширение из оригинального имени файла.
 * Санитизирует: только буквы, цифры, точка. Максимум 10 символов.
 */
export function extractSafeExtension(originalFilename: string, mimeType?: string): string {
  // Убираем null bytes и path separators
  const clean = originalFilename.replace(/[\x00/\\]/g, '');
  let ext = extname(clean).toLowerCase();

  // Только буквы, цифры, точка
  ext = ext.replace(/[^a-z0-9.]/g, '');

  // Ограничение длины
  if (ext.length > 10) ext = ext.substring(0, 10);

  // Если расширение невалидно — берём из MIME
  if (!ext || ext === '.') {
    ext = (mimeType && MIME_TO_EXT[mimeType]) || '.bin';
  }

  return ext;
}

/**
 * Извлекает формат (без точки) из имени файла.
 * "photo.jpg" → "jpg"
 * "document.docx" → "docx"
 */
export function extractFormat(filename: string): string {
  const ext = extname(filename).toLowerCase().replace('.', '');
  return ext || 'unknown';
}

/**
 * Генерирует имя файла для скачивания результата.
 * Берёт оригинальное имя, меняет расширение на целевой формат.
 *
 * "photo.jpg" + targetFormat="png" → "photo.png"
 * "document.docx" + targetFormat="pdf" → "document.pdf"
 */
export function generateOutputFilename(
  originalFilename: string,
  targetFormat?: string,
  operationType?: string,
): string {
  // Санитизируем оригинальное имя для отображения
  const clean = originalFilename
    .replace(/[\x00/\\]/g, '')  // null bytes, path separators
    .replace(/[<>:"|?*]/g, '_') // Windows-запрещённые символы
    .trim();

  const nameWithoutExt = clean.replace(/\.[^.]+$/, '');
  const safeName = nameWithoutExt.substring(0, 200); // Ограничение длины

  if (targetFormat) {
    return `${safeName}.${targetFormat}`;
  }

  // Для операций без смены формата (compress, rotate) — добавляем суффикс
  if (operationType) {
    const suffix = operationType.split('.').pop() || 'processed';
    const ext = extname(clean);
    return `${safeName}_${suffix}${ext}`;
  }

  return `${safeName}_processed${extname(clean)}`;
}
