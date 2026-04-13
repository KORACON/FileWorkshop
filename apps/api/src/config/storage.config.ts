import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs('storage', () => {
  const baseDir = process.env.STORAGE_BASE_DIR || join(process.cwd(), '..', '..', 'storage');
  return {
    baseDir,
    tempDir: join(baseDir, 'temp'),
    originalDir: join(baseDir, 'original'),
    processedDir: join(baseDir, 'processed'),
    quarantineDir: join(baseDir, 'quarantine'),
    failedDir: join(baseDir, 'failed'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
    allowedMimeTypes: [
      // Изображения
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
      'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml',
      // PDF
      'application/pdf',
      // Документы
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.oasis.opendocument.text', // odt
      'application/rtf', 'text/rtf',
      'text/plain', 'text/html', 'text/markdown',
      // Архивы
      'application/zip',
    ],
  };
});
