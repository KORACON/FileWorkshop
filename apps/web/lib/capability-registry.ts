/**
 * Capability Registry — единый источник правды о том,
 * какие операции доступны для какого файла.
 *
 * Архитектура:
 * 1. FileFamily — семейство файла (image/pdf/document/archive/other)
 * 2. FileSignature — расширение + MIME для определения семейства
 * 3. CapabilityAction — операция с метаданными
 * 4. SupportRule — какие расширения/MIME поддерживает операция
 *
 * Для добавления нового инструмента:
 *   1. Добавить CapabilityAction в ACTIONS
 *   2. Добавить SupportRule в SUPPORT_RULES
 *   Больше ничего менять не нужно.
 */

// ══════════════════════════════════════════
// ТИПЫ
// ══════════════════════════════════════════

export type FileFamily = 'image' | 'pdf' | 'document' | 'archive' | 'other';

export type ActionGroup = 'quick' | 'convert' | 'edit' | 'optimize' | 'extra'
  | 'pdf-organize' | 'pdf-optimize' | 'pdf-edit' | 'pdf-protect';

/** Какой UI-panel рендерить для этого действия */
export type UiPanel = 'resize' | 'remove-bg' | 'generic' | 'instant';

export interface ActionOption {
  key: string;
  type: 'slider' | 'select' | 'number';
  label: string;
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
  choices?: Array<{ value: string; label: string }>;
}

export interface CapabilityAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: ActionGroup;
  /** Backend operationType: image.convert, pdf.compress, doc.convert */
  operationType: string;
  /** Целевой формат (для конвертаций) */
  targetFormat?: string;
  /** Какой UI-panel рендерить */
  uiPanel: UiPanel;
  /** Параметры операции */
  options: ActionOption[];
  /** К какому семейству файлов относится */
  fileFamily: FileFamily;
}

/** Правило поддержки: какие расширения и MIME принимает операция */
interface SupportRule {
  actionId: string;
  extensions: string[];
  mimeTypes?: string[];
}

/** Результат определения файла */
export interface FileInfo {
  extension: string;
  mimeType: string | null;
  family: FileFamily;
  familyLabel: string;
  familyIcon: string;
}

// ══════════════════════════════════════════
// FILE FAMILY DETECTION
// ══════════════════════════════════════════

const FAMILY_MAP: Record<string, FileFamily> = {
  // Images
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', avif: 'image',
  bmp: 'image', tiff: 'image', tif: 'image', heic: 'image', heif: 'image',
  gif: 'image', ico: 'image', svg: 'image',
  // PDF
  pdf: 'pdf',
  // Documents
  docx: 'document', doc: 'document', odt: 'document', rtf: 'document', txt: 'document',
  html: 'document', htm: 'document', md: 'document',
  // Archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
};

const MIME_FAMILY_MAP: Record<string, FileFamily> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image',
  'image/avif': 'image', 'image/bmp': 'image', 'image/tiff': 'image',
  'image/heic': 'image', 'image/heif': 'image', 'image/gif': 'image',
  'image/svg+xml': 'image', 'image/x-icon': 'image',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/rtf': 'document', 'text/rtf': 'document',
  'text/plain': 'document', 'text/html': 'document', 'text/markdown': 'document',
  'application/zip': 'archive',
};

const FAMILY_META: Record<FileFamily, { label: string; icon: string }> = {
  image:    { label: 'Изображение', icon: '🖼' },
  pdf:      { label: 'PDF',         icon: '📄' },
  document: { label: 'Документ',    icon: '📝' },
  archive:  { label: 'Архив',       icon: '🗜' },
  other:    { label: 'Файл',        icon: '📎' },
};

/**
 * Определяет семейство файла по имени и/или MIME.
 */
export function detectFile(filename: string, mimeType?: string): FileInfo {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Приоритет: расширение → MIME
  let family: FileFamily = FAMILY_MAP[ext] || 'other';
  if (family === 'other' && mimeType) {
    family = MIME_FAMILY_MAP[mimeType] || 'other';
  }

  const meta = FAMILY_META[family];

  return {
    extension: ext,
    mimeType: mimeType || null,
    family,
    familyLabel: meta.label,
    familyIcon: meta.icon,
  };
}

/**
 * Проверяет, поддерживается ли файл хотя бы одной операцией.
 */
export function isFileSupported(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return SUPPORT_RULES.some((r) => r.extensions.includes(ext));
}

// ══════════════════════════════════════════
// ACTIONS REGISTRY
// ══════════════════════════════════════════

const ACTIONS: CapabilityAction[] = [
  // ─── Images: Special ───
  {
    id: 'remove-bg', name: 'Убрать фон', description: 'Удалить задний фон с изображения',
    icon: '✨', group: 'edit', operationType: 'image.remove_bg', targetFormat: 'png',
    uiPanel: 'remove-bg', fileFamily: 'image',
    options: [{ key: 'threshold', type: 'slider', label: 'Чувствительность', defaultValue: '50', min: 1, max: 100 }],
  },

  // ─── Images: Process ───
  {
    id: 'resize', name: 'Изменить размер', description: 'Изменить ширину и высоту',
    icon: '📐', group: 'edit', operationType: 'image.resize',
    uiPanel: 'resize', fileFamily: 'image', options: [],
  },
  {
    id: 'compress', name: 'Сжать', description: 'Уменьшить размер файла',
    icon: '🗜', group: 'edit', operationType: 'image.compress',
    uiPanel: 'generic', fileFamily: 'image',
    options: [{ key: 'quality', type: 'slider', label: 'Качество', defaultValue: '75', min: 1, max: 100 }],
  },
  {
    id: 'remove-exif', name: 'Удалить метаданные', description: 'Убрать EXIF, GPS, камеру',
    icon: '🧹', group: 'extra', operationType: 'image.remove_exif',
    uiPanel: 'instant', fileFamily: 'image', options: [],
  },
  {
    id: 'crop', name: 'Обрезать', description: 'Обрезать края изображения',
    icon: '✂️', group: 'edit', operationType: 'image.crop',
    uiPanel: 'generic', fileFamily: 'image',
    options: [
      { key: 'left', type: 'number', label: 'Слева (px)', defaultValue: '0', min: 0 },
      { key: 'top', type: 'number', label: 'Сверху (px)', defaultValue: '0', min: 0 },
      { key: 'width', type: 'number', label: 'Ширина (px)', defaultValue: '', min: 1 },
      { key: 'height', type: 'number', label: 'Высота (px)', defaultValue: '', min: 1 },
    ],
  },

  // ─── Images: Convert ───
  { id: 'to-png', name: 'PNG', description: 'Конвертировать в PNG', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'png',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
  { id: 'to-jpg', name: 'JPG', description: 'Конвертировать в JPG', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'jpg',
    uiPanel: 'generic', fileFamily: 'image',
    options: [{ key: 'quality', type: 'slider', label: 'Качество', defaultValue: '85', min: 1, max: 100 }] },
  { id: 'to-webp', name: 'WEBP', description: 'Конвертировать в WEBP', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'webp',
    uiPanel: 'generic', fileFamily: 'image',
    options: [{ key: 'quality', type: 'slider', label: 'Качество', defaultValue: '85', min: 1, max: 100 }] },
  { id: 'to-avif', name: 'AVIF', description: 'Конвертировать в AVIF', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'avif',
    uiPanel: 'generic', fileFamily: 'image',
    options: [{ key: 'quality', type: 'slider', label: 'Качество', defaultValue: '80', min: 1, max: 100 }] },
  { id: 'to-gif', name: 'GIF', description: 'Конвертировать в GIF', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'gif',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
  { id: 'to-tiff', name: 'TIFF', description: 'Конвертировать в TIFF', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'tiff',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
  { id: 'to-bmp', name: 'BMP', description: 'Конвертировать в BMP', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'bmp',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
  { id: 'to-ico', name: 'ICO', description: 'Конвертировать в ICO', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'ico',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
  { id: 'to-svg', name: 'SVG', description: 'Конвертировать в SVG', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'svg',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
  { id: 'to-heif', name: 'HEIF', description: 'Конвертировать в HEIF', icon: '🖼',
    group: 'convert', operationType: 'image.convert', targetFormat: 'heif',
    uiPanel: 'instant', fileFamily: 'image', options: [] },

  // ─── PDF: Организовать ───
  { id: 'pdf-merge', name: 'Объединить PDF', description: 'Соединить несколько PDF в один',
    icon: '', group: 'pdf-organize', operationType: 'pdf.merge', uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-split', name: 'Разделить PDF', description: 'Разбить PDF на отдельные файлы',
    icon: '', group: 'pdf-organize', operationType: 'pdf.split', uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-delete-pages', name: 'Удалить страницы', description: 'Убрать ненужные страницы из PDF',
    icon: '', group: 'pdf-organize', operationType: 'pdf.delete_pages', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'pages', type: 'number', label: 'Номера страниц (1,3,5-7)', defaultValue: '' }] },
  { id: 'pdf-extract-images', name: 'Извлечь изображения', description: 'Достать все картинки из PDF',
    icon: '', group: 'pdf-organize', operationType: 'pdf.extract_images', uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-reorder', name: 'Организовать PDF', description: 'Изменить порядок страниц',
    icon: '', group: 'pdf-organize', operationType: 'pdf.reorder', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'order', type: 'text' as any, label: 'Новый порядок (3,1,2,4)', defaultValue: '' }] },
  { id: 'pdf-scan', name: 'Сканировать в PDF', description: 'Создать PDF из отсканированных изображений',
    icon: '', group: 'pdf-organize', operationType: 'pdf.scan', uiPanel: 'instant', fileFamily: 'pdf', options: [] },

  // ─── PDF: Оптимизация ───
  { id: 'pdf-compress', name: 'Сжать PDF', description: 'Уменьшить размер файла',
    icon: '', group: 'pdf-optimize', operationType: 'pdf.compress', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'quality', type: 'select', label: 'Качество', defaultValue: 'ebook',
      choices: [{ value: 'screen', label: 'Минимальный (72 dpi)' }, { value: 'ebook', label: 'Баланс (150 dpi)' }, { value: 'printer', label: 'Печать (300 dpi)' }] }] },
  { id: 'pdf-repair', name: 'Восстановить PDF', description: 'Исправить повреждённый файл',
    icon: '', group: 'pdf-optimize', operationType: 'pdf.repair', uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-ocr', name: 'OCR PDF', description: 'Распознать текст на сканах',
    icon: '', group: 'pdf-optimize', operationType: 'pdf.ocr', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'language', type: 'select', label: 'Язык', defaultValue: 'rus',
      choices: [{ value: 'rus', label: 'Русский' }, { value: 'eng', label: 'English' }, { value: 'deu', label: 'Deutsch' }] }] },

  // ─── PDF: Редактировать ───
  { id: 'pdf-rotate', name: 'Повернуть PDF', description: 'Повернуть страницы на 90°, 180°, 270°',
    icon: '', group: 'pdf-edit', operationType: 'pdf.rotate', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'rotation', type: 'select', label: 'Угол', defaultValue: '90',
      choices: [{ value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' }] }] },
  { id: 'pdf-page-numbers', name: 'Добавить номера страниц', description: 'Пронумеровать страницы PDF',
    icon: '', group: 'pdf-edit', operationType: 'pdf.add_page_numbers', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'position', type: 'select', label: 'Позиция', defaultValue: 'bottom-center',
      choices: [{ value: 'bottom-center', label: 'Внизу по центру' }, { value: 'bottom-right', label: 'Внизу справа' }, { value: 'top-center', label: 'Вверху по центру' }, { value: 'top-right', label: 'Вверху справа' }] }] },
  { id: 'pdf-watermark', name: 'Добавить водяной знак', description: 'Наложить текстовый штамп',
    icon: '', group: 'pdf-edit', operationType: 'pdf.watermark', uiPanel: 'generic', fileFamily: 'pdf',
    options: [
      { key: 'text', type: 'text' as any, label: 'Текст', defaultValue: '' },
      { key: 'opacity', type: 'slider', label: 'Прозрачность', defaultValue: '30', min: 5, max: 100 },
    ] },
  { id: 'pdf-crop', name: 'Обрезка PDF', description: 'Обрезать поля страниц',
    icon: '', group: 'pdf-edit', operationType: 'pdf.crop', uiPanel: 'generic', fileFamily: 'pdf',
    options: [
      { key: 'top', type: 'number', label: 'Сверху (мм)', defaultValue: '0', min: 0 },
      { key: 'bottom', type: 'number', label: 'Снизу (мм)', defaultValue: '0', min: 0 },
      { key: 'left', type: 'number', label: 'Слева (мм)', defaultValue: '0', min: 0 },
      { key: 'right', type: 'number', label: 'Справа (мм)', defaultValue: '0', min: 0 },
    ] },
  { id: 'pdf-annotate', name: 'Редактировать PDF', description: 'Добавить текст и аннотации',
    icon: '', group: 'pdf-edit', operationType: 'pdf.annotate', uiPanel: 'instant', fileFamily: 'pdf', options: [] },

  // ─── PDF: Защита ───
  { id: 'pdf-unlock', name: 'Открыть PDF', description: 'Снять пароль с защищённого PDF',
    icon: '', group: 'pdf-protect', operationType: 'pdf.unlock', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'password', type: 'text' as any, label: 'Текущий пароль', defaultValue: '' }] },
  { id: 'pdf-protect', name: 'Защита PDF', description: 'Установить пароль на открытие',
    icon: '', group: 'pdf-protect', operationType: 'pdf.protect', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'password', type: 'text' as any, label: 'Пароль', defaultValue: '' }] },
  { id: 'pdf-sign', name: 'Подписать PDF', description: 'Добавить электронную подпись',
    icon: '', group: 'pdf-protect', operationType: 'pdf.sign', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'text', type: 'text' as any, label: 'Текст подписи', defaultValue: '' }] },
  { id: 'pdf-redact', name: 'Скрыть данные в PDF', description: 'Замазать конфиденциальную информацию',
    icon: '', group: 'pdf-protect', operationType: 'pdf.redact', uiPanel: 'generic', fileFamily: 'pdf',
    options: [{ key: 'pages', type: 'number', label: 'Страницы (1,3,5-7)', defaultValue: '' }] },
  { id: 'pdf-compare', name: 'Сравнение PDF-файлов', description: 'Сравнить два PDF документа',
    icon: '', group: 'pdf-protect', operationType: 'pdf.compare', uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-remove-meta', name: 'Удалить метаданные', description: 'Очистить автора, заголовок, теги',
    icon: '', group: 'pdf-protect', operationType: 'pdf.remove_metadata', uiPanel: 'instant', fileFamily: 'pdf', options: [] },

  // ─── PDF: Конвертация ───
  { id: 'pdf-to-images', name: 'PDF в JPG', description: 'Страницы → изображения',
    icon: '', group: 'convert', operationType: 'pdf.to_images', uiPanel: 'generic', fileFamily: 'pdf',
    options: [
      { key: 'format', type: 'select', label: 'Формат', defaultValue: 'png', choices: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }] },
      { key: 'dpi', type: 'select', label: 'Качество', defaultValue: '150', choices: [{ value: '72', label: '72 dpi' }, { value: '150', label: '150 dpi' }, { value: '300', label: '300 dpi' }] },
    ] },
  { id: 'pdf-to-txt', name: 'PDF в TXT', description: 'Извлечь текст',
    icon: '', group: 'convert', operationType: 'pdf.to_text', targetFormat: 'txt',
    uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-to-docx', name: 'PDF в WORD', description: 'Конвертировать в DOCX',
    icon: '', group: 'convert', operationType: 'pdf.to_docx', targetFormat: 'docx',
    uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-to-pptx', name: 'PDF в POWERPOINT', description: 'Конвертировать в PPTX',
    icon: '', group: 'convert', operationType: 'pdf.to_pptx', targetFormat: 'pptx',
    uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-to-xlsx', name: 'PDF в EXCEL', description: 'Конвертировать в XLSX',
    icon: '', group: 'convert', operationType: 'pdf.to_xlsx', targetFormat: 'xlsx',
    uiPanel: 'instant', fileFamily: 'pdf', options: [] },
  { id: 'pdf-to-html', name: 'PDF в HTML', description: 'Конвертировать в HTML',
    icon: '', group: 'convert', operationType: 'pdf.to_html', targetFormat: 'html',
    uiPanel: 'instant', fileFamily: 'pdf', options: [] },

  // ─── Documents: Convert ───
  { id: 'doc-to-pdf', name: 'В PDF', description: 'Конвертировать в PDF', icon: '📄',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'pdf',
    uiPanel: 'instant', fileFamily: 'document', options: [] },
  { id: 'doc-to-txt', name: 'В TXT', description: 'Извлечь текст', icon: '📝',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'txt',
    uiPanel: 'instant', fileFamily: 'document', options: [] },
  { id: 'doc-to-docx', name: 'В DOCX', description: 'Конвертировать в DOCX', icon: '📝',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'docx',
    uiPanel: 'instant', fileFamily: 'document', options: [] },
  { id: 'doc-to-rtf', name: 'В RTF', description: 'Конвертировать в RTF', icon: '📝',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'rtf',
    uiPanel: 'instant', fileFamily: 'document', options: [] },
  { id: 'doc-to-odt', name: 'В ODT', description: 'Конвертировать в ODT', icon: '📝',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'odt',
    uiPanel: 'instant', fileFamily: 'document', options: [] },
  { id: 'md-to-html', name: 'В HTML', description: 'Markdown → HTML', icon: '🌐',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'html',
    uiPanel: 'instant', fileFamily: 'document', options: [] },
  { id: 'html-to-md', name: 'В Markdown', description: 'HTML → Markdown', icon: '📋',
    group: 'convert', operationType: 'doc.convert', targetFormat: 'md',
    uiPanel: 'instant', fileFamily: 'document', options: [] },

  // ─── PDF: From Images ───
  { id: 'images-to-pdf', name: 'В PDF', description: 'Собрать изображение в PDF', icon: '📄',
    group: 'convert', operationType: 'pdf.from_images',
    uiPanel: 'instant', fileFamily: 'image', options: [] },
];

// ══════════════════════════════════════════
// SUPPORT RULES — какие расширения/MIME принимает каждая операция
// ══════════════════════════════════════════

const SUPPORT_RULES: SupportRule[] = [
  // Images: process — основные форматы
  { actionId: 'remove-bg',   extensions: ['jpg','jpeg','png','webp','avif','bmp','tiff','tif','heic','heif','gif'] },
  { actionId: 'resize',      extensions: ['jpg','jpeg','png','webp','avif','bmp','tiff','tif'] },
  { actionId: 'compress',    extensions: ['jpg','jpeg','png','webp'] },
  { actionId: 'remove-exif', extensions: ['jpg','jpeg','png','webp','tiff','tif'] },
  { actionId: 'crop',        extensions: ['jpg','jpeg','png','webp'] },
  // Images: convert — расширенная матрица
  { actionId: 'to-png',  extensions: ['jpg','jpeg','webp','avif','bmp','tiff','tif','heic','heif','gif','ico','svg'] },
  { actionId: 'to-jpg',  extensions: ['png','webp','avif','bmp','tiff','tif','heic','heif','gif','ico','svg'] },
  { actionId: 'to-webp', extensions: ['jpg','jpeg','png','avif','bmp','tiff','tif','heic','heif','gif'] },
  { actionId: 'to-avif', extensions: ['jpg','jpeg','png','webp','bmp','tiff','tif','heic','heif','gif'] },
  { actionId: 'to-gif',  extensions: ['jpg','jpeg','png','webp','avif','bmp','tiff','tif','heic','heif'] },
  { actionId: 'to-tiff', extensions: ['jpg','jpeg','png','webp','avif','bmp','heic','heif','gif'] },
  { actionId: 'to-bmp',  extensions: ['jpg','jpeg','png','webp','avif','tiff','tif','heic','heif','gif'] },
  { actionId: 'to-ico',  extensions: ['jpg','jpeg','png','webp','avif','bmp','gif'] },
  { actionId: 'to-svg',  extensions: ['jpg','jpeg','png','webp','avif','bmp','tiff','tif','gif'] },
  { actionId: 'to-heif', extensions: ['jpg','jpeg','png','webp','avif','bmp','tiff','tif','gif'] },
  // Images → PDF
  { actionId: 'images-to-pdf', extensions: ['jpg','jpeg','png','webp','bmp','tiff','tif'] },
  // PDF: process
  // PDF
  { actionId: 'pdf-merge',            extensions: ['pdf'] },
  { actionId: 'pdf-split',            extensions: ['pdf'] },
  { actionId: 'pdf-delete-pages',     extensions: ['pdf'] },
  { actionId: 'pdf-extract-images',   extensions: ['pdf'] },
  { actionId: 'pdf-reorder',          extensions: ['pdf'] },
  { actionId: 'pdf-scan',             extensions: ['pdf'] },
  { actionId: 'pdf-compress',         extensions: ['pdf'] },
  { actionId: 'pdf-repair',           extensions: ['pdf'] },
  { actionId: 'pdf-ocr',              extensions: ['pdf'] },
  { actionId: 'pdf-rotate',           extensions: ['pdf'] },
  { actionId: 'pdf-page-numbers',     extensions: ['pdf'] },
  { actionId: 'pdf-watermark',        extensions: ['pdf'] },
  { actionId: 'pdf-crop',             extensions: ['pdf'] },
  { actionId: 'pdf-annotate',         extensions: ['pdf'] },
  { actionId: 'pdf-unlock',           extensions: ['pdf'] },
  { actionId: 'pdf-protect',          extensions: ['pdf'] },
  { actionId: 'pdf-sign',             extensions: ['pdf'] },
  { actionId: 'pdf-redact',           extensions: ['pdf'] },
  { actionId: 'pdf-compare',          extensions: ['pdf'] },
  { actionId: 'pdf-remove-meta',      extensions: ['pdf'] },
  { actionId: 'pdf-to-images',        extensions: ['pdf'] },
  { actionId: 'pdf-to-txt',           extensions: ['pdf'] },
  { actionId: 'pdf-to-docx',          extensions: ['pdf'] },
  { actionId: 'pdf-to-pptx',          extensions: ['pdf'] },
  { actionId: 'pdf-to-xlsx',          extensions: ['pdf'] },
  { actionId: 'pdf-to-html',          extensions: ['pdf'] },
  // Documents: convert
  { actionId: 'doc-to-pdf',  extensions: ['docx','doc','odt','rtf','txt','html','htm','md'] },
  { actionId: 'doc-to-txt',  extensions: ['docx','doc','odt','rtf','pdf','html','htm'] },
  { actionId: 'doc-to-docx', extensions: ['doc','odt','rtf','txt','html','htm','md','pdf'] },
  { actionId: 'doc-to-rtf',  extensions: ['docx','doc','odt','txt','html','htm'] },
  { actionId: 'doc-to-odt',  extensions: ['docx','doc','rtf','txt','html','htm'] },
  { actionId: 'md-to-html',  extensions: ['md'] },
  { actionId: 'html-to-md',  extensions: ['html','htm'] },
];

// Build lookup: actionId → SupportRule
const RULE_MAP = new Map<string, SupportRule>();
for (const rule of SUPPORT_RULES) {
  RULE_MAP.set(rule.actionId, rule);
}

// Build lookup: actionId → CapabilityAction
const ACTION_MAP = new Map<string, CapabilityAction>();
for (const action of ACTIONS) {
  ACTION_MAP.set(action.id, action);
}

// ══════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════

/**
 * Возвращает список действий, доступных для данного файла.
 * Проверяет по расширению и MIME. Исключает конвертацию в тот же формат.
 */
export function getActionsForFile(filename: string, mimeType?: string): CapabilityAction[] {
  const info = detectFile(filename, mimeType);
  const result: CapabilityAction[] = [];

  for (const action of ACTIONS) {
    const rule = RULE_MAP.get(action.id);
    if (!rule) continue;

    // Проверка по расширению
    let supported = rule.extensions.includes(info.extension);

    // Fallback: проверка по MIME
    if (!supported && info.mimeType && rule.mimeTypes) {
      supported = rule.mimeTypes.includes(info.mimeType);
    }

    if (!supported) continue;

    // Не показываем конвертацию в тот же формат (кроме операций обработки вроде remove_bg)
    if (action.targetFormat && action.operationType.endsWith('.convert')) {
      if (action.targetFormat === info.extension) continue;
      if (action.targetFormat === 'jpg' && info.extension === 'jpeg') continue;
      if (action.targetFormat === 'jpeg' && info.extension === 'jpg') continue;
    }

    result.push(action);
  }

  return result;
}

/**
 * Возвращает действия, сгруппированные для burger menu.
 */
export function getGroupedActions(filename: string, mimeType?: string): {
  quick: CapabilityAction[];
  convert: CapabilityAction[];
  edit: CapabilityAction[];
  optimize: CapabilityAction[];
  extra: CapabilityAction[];
} {
  const actions = getActionsForFile(filename, mimeType);
  return {
    quick: actions.filter((a) => a.group === 'quick'),
    convert: actions.filter((a) => a.group === 'convert'),
    edit: actions.filter((a) => a.group === 'edit'),
    optimize: actions.filter((a) => a.group === 'optimize'),
    extra: actions.filter((a) => a.group === 'extra'),
  };
}

/**
 * Находит action по id.
 */
export function getActionById(id: string): CapabilityAction | undefined {
  return ACTION_MAP.get(id);
}

/**
 * Возвращает все зарегистрированные actions (для /tools страницы).
 */
export function getAllActions(): CapabilityAction[] {
  return [...ACTIONS];
}

/**
 * Возвращает все поддерживаемые расширения.
 */
export function getAllSupportedExtensions(): string[] {
  const exts = new Set<string>();
  for (const rule of SUPPORT_RULES) {
    for (const ext of rule.extensions) exts.add(ext);
  }
  return [...exts].sort();
}

/**
 * Возвращает метаданные семейства файлов.
 */
export function getFamilyMeta(family: FileFamily): { label: string; icon: string } {
  return FAMILY_META[family];
}



