import { Tool } from '@/types/tool';

const MB = 1024 * 1024;

export const tools: Tool[] = [
  // ════════════════════════════════════════
  // ИЗОБРАЖЕНИЯ
  // ════════════════════════════════════════
  {
    id: 'jpg-to-png',
    category: 'images',
    operationType: 'image.convert',
    name: { ru: 'JPG в PNG', en: 'JPG to PNG' },
    description: { ru: 'Конвертировать JPG в PNG без потери качества', en: 'Convert JPG to PNG losslessly' },
    icon: '🖼',
    sourceFormats: ['jpg', 'jpeg'],
    targetFormat: 'png',
    acceptMime: ['image/jpeg'],
    maxFileSize: 50 * MB,
    options: [],
    popular: true,
  },
  {
    id: 'png-to-jpg',
    category: 'images',
    operationType: 'image.convert',
    name: { ru: 'PNG в JPG', en: 'PNG to JPG' },
    description: { ru: 'Конвертировать PNG в JPG с настройкой качества', en: 'Convert PNG to JPG with quality control' },
    icon: '🖼',
    sourceFormats: ['png'],
    targetFormat: 'jpg',
    acceptMime: ['image/png'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'quality', type: 'slider', label: { ru: 'Качество', en: 'Quality' }, default: '85', min: 1, max: 100, step: 1 },
    ],
    popular: true,
  },
  {
    id: 'webp-to-jpg',
    category: 'images',
    operationType: 'image.convert',
    name: { ru: 'WEBP в JPG', en: 'WEBP to JPG' },
    description: { ru: 'Конвертировать WEBP в JPG', en: 'Convert WEBP to JPG' },
    icon: '🖼',
    sourceFormats: ['webp'],
    targetFormat: 'jpg',
    acceptMime: ['image/webp'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'quality', type: 'slider', label: { ru: 'Качество', en: 'Quality' }, default: '85', min: 1, max: 100 },
    ],
  },
  {
    id: 'heic-to-jpg',
    category: 'images',
    operationType: 'image.convert',
    name: { ru: 'HEIC в JPG', en: 'HEIC to JPG' },
    description: { ru: 'Конвертировать фото iPhone (HEIC) в JPG', en: 'Convert iPhone photos (HEIC) to JPG' },
    icon: '📱',
    sourceFormats: ['heic', 'heif'],
    targetFormat: 'jpg',
    acceptMime: ['image/heic', 'image/heif'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'quality', type: 'slider', label: { ru: 'Качество', en: 'Quality' }, default: '90', min: 1, max: 100 },
    ],
    popular: true,
  },
  {
    id: 'image-resize',
    category: 'images',
    operationType: 'image.resize',
    name: { ru: 'Изменить размер', en: 'Resize Image' },
    description: { ru: 'Изменить размер изображения', en: 'Resize image to specific dimensions' },
    icon: '📐',
    sourceFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'tiff'],
    acceptMime: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'width', type: 'number', label: { ru: 'Ширина (px)', en: 'Width (px)' }, default: '', min: 1, max: 16384, placeholder: { ru: 'Авто', en: 'Auto' } },
      { key: 'height', type: 'number', label: { ru: 'Высота (px)', en: 'Height (px)' }, default: '', min: 1, max: 16384, placeholder: { ru: 'Авто', en: 'Auto' } },
      { key: 'fit', type: 'select', label: { ru: 'Режим', en: 'Fit mode' }, default: 'inside', choices: [
        { value: 'inside', label: { ru: 'Вписать (сохранить пропорции)', en: 'Fit inside (keep ratio)' } },
        { value: 'cover', label: { ru: 'Заполнить (обрезать)', en: 'Cover (crop)' } },
        { value: 'contain', label: { ru: 'Вписать + фон', en: 'Contain (add background)' } },
        { value: 'fill', label: { ru: 'Растянуть', en: 'Stretch' } },
      ]},
    ],
    popular: true,
  },
  {
    id: 'image-compress',
    category: 'images',
    operationType: 'image.compress',
    name: { ru: 'Сжать изображение', en: 'Compress Image' },
    description: { ru: 'Уменьшить размер файла с контролем качества', en: 'Reduce file size with quality control' },
    icon: '🗜',
    sourceFormats: ['jpg', 'jpeg', 'png', 'webp'],
    acceptMime: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'quality', type: 'slider', label: { ru: 'Качество', en: 'Quality' }, default: '75', min: 1, max: 100 },
    ],
    popular: true,
  },
  {
    id: 'image-remove-bg',
    category: 'images',
    operationType: 'image.remove_bg',
    name: { ru: 'Убрать фон', en: 'Remove Background' },
    description: { ru: 'Удалить задний фон с изображения', en: 'Remove image background' },
    icon: '✨',
    sourceFormats: ['jpg', 'jpeg', 'png', 'webp'],
    targetFormat: 'png',
    acceptMime: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'threshold', type: 'slider', label: { ru: 'Чувствительность', en: 'Sensitivity' }, default: '50', min: 1, max: 100 },
    ],
    popular: true,
  },

  // ════════════════════════════════════════
  // PDF
  // ════════════════════════════════════════
  {
    id: 'compress-pdf',
    category: 'pdf',
    operationType: 'pdf.compress',
    name: { ru: 'Сжать PDF', en: 'Compress PDF' },
    description: { ru: 'Уменьшить размер PDF-файла', en: 'Reduce PDF file size' },
    icon: '📄',
    sourceFormats: ['pdf'],
    acceptMime: ['application/pdf'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'quality', type: 'select', label: { ru: 'Качество', en: 'Quality' }, default: 'ebook', choices: [
        { value: 'screen', label: { ru: 'Минимальный размер (72 dpi)', en: 'Minimum size (72 dpi)' } },
        { value: 'ebook', label: { ru: 'Баланс (150 dpi)', en: 'Balanced (150 dpi)' } },
        { value: 'printer', label: { ru: 'Для печати (300 dpi)', en: 'Print quality (300 dpi)' } },
      ]},
    ],
    popular: true,
  },
  {
    id: 'merge-pdf',
    category: 'pdf',
    operationType: 'pdf.merge',
    name: { ru: 'Объединить PDF', en: 'Merge PDF' },
    description: { ru: 'Объединить несколько PDF в один', en: 'Merge multiple PDFs into one' },
    icon: '📑',
    sourceFormats: ['pdf'],
    acceptMime: ['application/pdf'],
    maxFileSize: 50 * MB,
    options: [],
    multiFile: true,
    popular: true,
  },
  {
    id: 'split-pdf',
    category: 'pdf',
    operationType: 'pdf.split',
    name: { ru: 'Разделить PDF', en: 'Split PDF' },
    description: { ru: 'Разделить PDF на отдельные страницы', en: 'Split PDF into individual pages' },
    icon: '✂️',
    sourceFormats: ['pdf'],
    acceptMime: ['application/pdf'],
    maxFileSize: 50 * MB,
    options: [],
  },
  {
    id: 'pdf-to-images',
    category: 'pdf',
    operationType: 'pdf.to_images',
    name: { ru: 'PDF в изображения', en: 'PDF to Images' },
    description: { ru: 'Конвертировать страницы PDF в PNG или JPG', en: 'Convert PDF pages to PNG or JPG' },
    icon: '🖼',
    sourceFormats: ['pdf'],
    acceptMime: ['application/pdf'],
    maxFileSize: 50 * MB,
    options: [
      { key: 'format', type: 'select', label: { ru: 'Формат', en: 'Format' }, default: 'png', choices: [
        { value: 'png', label: { ru: 'PNG', en: 'PNG' } },
        { value: 'jpg', label: { ru: 'JPG', en: 'JPG' } },
      ]},
      { key: 'dpi', type: 'select', label: { ru: 'Качество', en: 'Quality' }, default: '150', choices: [
        { value: '72', label: { ru: 'Превью (72 dpi)', en: 'Preview (72 dpi)' } },
        { value: '150', label: { ru: 'Стандарт (150 dpi)', en: 'Standard (150 dpi)' } },
        { value: '300', label: { ru: 'Высокое (300 dpi)', en: 'High (300 dpi)' } },
      ]},
    ],
  },

  // ════════════════════════════════════════
  // ДОКУМЕНТЫ
  // ════════════════════════════════════════
  {
    id: 'docx-to-pdf',
    category: 'documents',
    operationType: 'doc.convert',
    name: { ru: 'DOCX в PDF', en: 'DOCX to PDF' },
    description: { ru: 'Конвертировать Word-документ в PDF', en: 'Convert Word document to PDF' },
    icon: '📝',
    sourceFormats: ['docx'],
    targetFormat: 'pdf',
    acceptMime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxFileSize: 50 * MB,
    options: [],
    popular: true,
  },
  {
    id: 'md-to-html',
    category: 'documents',
    operationType: 'doc.convert',
    name: { ru: 'Markdown в HTML', en: 'Markdown to HTML' },
    description: { ru: 'Конвертировать Markdown в HTML', en: 'Convert Markdown to HTML' },
    icon: '📋',
    sourceFormats: ['md'],
    targetFormat: 'html',
    acceptMime: ['text/markdown'],
    maxFileSize: 10 * MB,
    options: [],
  },
  {
    id: 'html-to-md',
    category: 'documents',
    operationType: 'doc.convert',
    name: { ru: 'HTML в Markdown', en: 'HTML to Markdown' },
    description: { ru: 'Конвертировать HTML в Markdown', en: 'Convert HTML to Markdown' },
    icon: '📋',
    sourceFormats: ['html', 'htm'],
    targetFormat: 'md',
    acceptMime: ['text/html'],
    maxFileSize: 10 * MB,
    options: [],
  },
];

// ════════════════════════════════════════
// УТИЛИТЫ
// ════════════════════════════════════════

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}

export function getToolsByCategory(category: string): Tool[] {
  return tools.filter((t) => t.category === category);
}

export function getPopularTools(): Tool[] {
  return tools.filter((t) => t.popular);
}

export function getAllCategories(): Array<{ id: string; name: { ru: string; en: string }; icon: string; count: number }> {
  return [
    { id: 'images', name: { ru: 'Изображения', en: 'Images' }, icon: '🖼', count: getToolsByCategory('images').length },
    { id: 'pdf', name: { ru: 'PDF', en: 'PDF' }, icon: '📄', count: getToolsByCategory('pdf').length },
    { id: 'documents', name: { ru: 'Документы', en: 'Documents' }, icon: '📝', count: getToolsByCategory('documents').length },
    { id: 'utilities', name: { ru: 'Утилиты', en: 'Utilities' }, icon: '🗜', count: getToolsByCategory('utilities').length },
  ];
}

/**
 * Определяет доступные инструменты по расширению файла.
 * Это ядро нового UX: пользователь кидает файл → видит что можно сделать.
 */
export function getToolsForFile(filename: string): Tool[] {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return tools.filter((t) => t.sourceFormats.includes(ext));
}

/**
 * Определяет тип файла для отображения.
 */
export function getFileCategory(filename: string): { type: string; icon: string; label: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'gif'];
  const pdfExts = ['pdf'];
  const docExts = ['docx', 'odt', 'rtf', 'txt', 'html', 'htm', 'md'];

  if (imageExts.includes(ext)) return { type: 'image', icon: '🖼', label: 'Изображение' };
  if (pdfExts.includes(ext)) return { type: 'pdf', icon: '📄', label: 'PDF' };
  if (docExts.includes(ext)) return { type: 'document', icon: '📝', label: 'Документ' };
  return { type: 'unknown', icon: '📎', label: 'Файл' };
}
