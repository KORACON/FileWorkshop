export const FILE_LIMITS = {
  /** Максимальный размер файла в байтах (50 МБ по умолчанию) */
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  /** Максимальное количество файлов в одном запросе */
  MAX_FILES_PER_REQUEST: 20,

  /** Допустимые расширения файлов */
  ALLOWED_EXTENSIONS: [
    // Изображения
    '.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.tiff', '.tif', '.heic', '.heif',
    '.gif', '.ico', '.svg',
    // PDF
    '.pdf',
    // Документы
    '.docx', '.odt', '.rtf', '.txt', '.html', '.htm', '.md',
    // Архивы
    '.zip',
  ],
} as const;
