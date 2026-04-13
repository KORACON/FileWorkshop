export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
] as const;

export const PDF_MIME_TYPES = [
  'application/pdf',
] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/rtf',
  'text/plain',
  'text/html',
  'text/markdown',
] as const;

export const ARCHIVE_MIME_TYPES = [
  'application/zip',
] as const;

export const ALL_ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...PDF_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
  ...ARCHIVE_MIME_TYPES,
] as const;
