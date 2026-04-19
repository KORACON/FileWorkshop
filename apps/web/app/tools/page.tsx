'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/footer';

interface ToolCard {
  id: string;
  actionId: string;
  name: string;
  description: string;
  category: string;
  formats: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'img-convert', label: 'Конвертация изображений' },
  { id: 'img-edit', label: 'Редактирование изображений' },
  { id: 'pdf-organize', label: 'Организовать PDF' },
  { id: 'pdf-optimize', label: 'Оптимизация PDF' },
  { id: 'pdf-convert', label: 'Конвертировать PDF' },
  { id: 'pdf-edit', label: 'Редактировать PDF' },
  { id: 'pdf-protect', label: 'Защита PDF' },
  { id: 'doc-convert', label: 'Документы' },
];

// Helper to generate image conversion cards
function imgConv(from: string, to: string, actionId: string): ToolCard {
  return {
    id: `${from.toLowerCase()}-to-${to.toLowerCase()}`,
    actionId,
    name: `${from} в ${to}`,
    description: `Конвертировать ${from} в ${to}`,
    category: 'img-convert',
    formats: [from.toLowerCase(), to.toLowerCase()],
  };
}

const TOOLS: ToolCard[] = [
  // ═══ Конвертация изображений ═══
  imgConv('JPG', 'PNG', 'to-png'), imgConv('JPG', 'WEBP', 'to-webp'), imgConv('JPG', 'AVIF', 'to-avif'),
  imgConv('JPG', 'GIF', 'to-gif'), imgConv('JPG', 'TIFF', 'to-tiff'), imgConv('JPG', 'PDF', 'images-to-pdf'),
  imgConv('PNG', 'JPG', 'to-jpg'), imgConv('PNG', 'WEBP', 'to-webp'), imgConv('PNG', 'AVIF', 'to-avif'),
  imgConv('PNG', 'GIF', 'to-gif'), imgConv('PNG', 'TIFF', 'to-tiff'), imgConv('PNG', 'PDF', 'images-to-pdf'),
  imgConv('WEBP', 'JPG', 'to-jpg'), imgConv('WEBP', 'PNG', 'to-png'), imgConv('WEBP', 'AVIF', 'to-avif'),
  imgConv('WEBP', 'GIF', 'to-gif'), imgConv('WEBP', 'TIFF', 'to-tiff'),
  imgConv('AVIF', 'JPG', 'to-jpg'), imgConv('AVIF', 'PNG', 'to-png'), imgConv('AVIF', 'WEBP', 'to-webp'),
  imgConv('HEIC', 'JPG', 'to-jpg'), imgConv('HEIC', 'PNG', 'to-png'), imgConv('HEIC', 'WEBP', 'to-webp'),
  imgConv('GIF', 'JPG', 'to-jpg'), imgConv('GIF', 'PNG', 'to-png'), imgConv('GIF', 'WEBP', 'to-webp'),
  imgConv('BMP', 'JPG', 'to-jpg'), imgConv('BMP', 'PNG', 'to-png'), imgConv('BMP', 'WEBP', 'to-webp'),
  imgConv('TIFF', 'JPG', 'to-jpg'), imgConv('TIFF', 'PNG', 'to-png'), imgConv('TIFF', 'WEBP', 'to-webp'),
  imgConv('SVG', 'JPG', 'to-jpg'), imgConv('SVG', 'PNG', 'to-png'),
  imgConv('ICO', 'JPG', 'to-jpg'), imgConv('ICO', 'PNG', 'to-png'),

  // ═══ Редактирование изображений ═══
  { id: 'img-resize', actionId: 'resize', name: 'Изменить размер', description: 'Измените ширину и высоту изображения с точностью до пикселя', category: 'img-edit', formats: ['jpg','png','webp','avif'] },
  { id: 'img-compress', actionId: 'compress', name: 'Сжать изображение', description: 'Уменьшите размер файла с контролем качества', category: 'img-edit', formats: ['jpg','png','webp'] },
  { id: 'img-remove-bg', actionId: 'remove-bg', name: 'Убрать фон', description: 'Удалите задний фон с изображения с ручной дочисткой', category: 'img-edit', formats: ['jpg','png','webp','avif'] },
  { id: 'img-crop', actionId: 'crop', name: 'Обрезать изображение', description: 'Обрежьте края изображения', category: 'img-edit', formats: ['jpg','png','webp'] },
  { id: 'img-exif', actionId: 'remove-exif', name: 'Удалить метаданные', description: 'Убрать EXIF, GPS, информацию о камере', category: 'img-edit', formats: ['jpg','png','webp','tiff'] },

  // ═══ PDF — Организовать ═══
  { id: 'pdf-merge', actionId: 'pdf-merge', name: 'Объединить PDF', description: 'Объедините несколько PDF-файлов в один документ', category: 'pdf-organize', formats: ['pdf'] },
  { id: 'pdf-split', actionId: 'pdf-split', name: 'Разделить PDF', description: 'Разбейте PDF на отдельные файлы по страницам', category: 'pdf-organize', formats: ['pdf'] },
  { id: 'pdf-delete', actionId: 'pdf-delete-pages', name: 'Удалить страницы', description: 'Удалите ненужные страницы из PDF', category: 'pdf-organize', formats: ['pdf'] },
  { id: 'pdf-extract-img', actionId: 'pdf-extract-images', name: 'Извлечь изображения', description: 'Достаньте все картинки из PDF-файла', category: 'pdf-organize', formats: ['pdf'] },
  { id: 'pdf-reorder', actionId: 'pdf-reorder', name: 'Организовать PDF', description: 'Измените порядок страниц в документе', category: 'pdf-organize', formats: ['pdf'] },
  { id: 'pdf-scan', actionId: 'pdf-scan', name: 'Сканировать в PDF', description: 'Создайте PDF из отсканированных изображений', category: 'pdf-organize', formats: ['pdf'] },

  // ═══ PDF — Оптимизация ═══
  { id: 'pdf-compress', actionId: 'pdf-compress', name: 'Сжать PDF', description: 'Уменьшите размер PDF без потери качества', category: 'pdf-optimize', formats: ['pdf'] },
  { id: 'pdf-repair', actionId: 'pdf-repair', name: 'Восстановить PDF', description: 'Исправьте повреждённый PDF-файл', category: 'pdf-optimize', formats: ['pdf'] },
  { id: 'pdf-ocr', actionId: 'pdf-ocr', name: 'OCR PDF', description: 'Распознайте текст на сканированных страницах', category: 'pdf-optimize', formats: ['pdf'] },

  // ═══ PDF — Конвертировать ═══
  { id: 'pdf-to-word', actionId: 'pdf-to-docx', name: 'PDF в Word', description: 'Конвертируйте PDF в редактируемый DOCX', category: 'pdf-convert', formats: ['pdf','docx'] },
  { id: 'pdf-to-ppt', actionId: 'pdf-to-pptx', name: 'PDF в PowerPoint', description: 'Конвертируйте PDF в презентацию PPTX', category: 'pdf-convert', formats: ['pdf','pptx'] },
  { id: 'pdf-to-excel', actionId: 'pdf-to-xlsx', name: 'PDF в Excel', description: 'Извлеките таблицы из PDF в XLSX', category: 'pdf-convert', formats: ['pdf','xlsx'] },
  { id: 'pdf-to-jpg', actionId: 'pdf-to-images', name: 'PDF в JPG', description: 'Конвертируйте страницы PDF в изображения', category: 'pdf-convert', formats: ['pdf','jpg'] },
  { id: 'pdf-to-html', actionId: 'pdf-to-html', name: 'PDF в HTML', description: 'Преобразуйте PDF в HTML-страницу', category: 'pdf-convert', formats: ['pdf','html'] },
  { id: 'pdf-to-txt', actionId: 'pdf-to-txt', name: 'PDF в TXT', description: 'Извлеките текст из PDF-документа', category: 'pdf-convert', formats: ['pdf','txt'] },
  { id: 'word-to-pdf', actionId: 'doc-to-pdf', name: 'Word в PDF', description: 'Конвертируйте DOCX/DOC в PDF', category: 'pdf-convert', formats: ['docx','pdf'] },
  { id: 'jpg-to-pdf', actionId: 'images-to-pdf', name: 'JPG в PDF', description: 'Соберите изображения в PDF-документ', category: 'pdf-convert', formats: ['jpg','pdf'] },
  { id: 'ppt-to-pdf', actionId: 'doc-to-pdf', name: 'PowerPoint в PDF', description: 'Конвертируйте PPT/PPTX в PDF', category: 'pdf-convert', formats: ['pptx','pdf'] },
  { id: 'excel-to-pdf', actionId: 'doc-to-pdf', name: 'Excel в PDF', description: 'Конвертируйте XLSX/XLS в PDF', category: 'pdf-convert', formats: ['xlsx','pdf'] },
  { id: 'html-to-pdf', actionId: 'doc-to-pdf', name: 'HTML в PDF', description: 'Преобразуйте HTML-страницу в PDF', category: 'pdf-convert', formats: ['html','pdf'] },

  // ═══ PDF — Редактировать ═══
  { id: 'pdf-rotate', actionId: 'pdf-rotate', name: 'Повернуть PDF', description: 'Поверните страницы на 90°, 180° или 270°', category: 'pdf-edit', formats: ['pdf'] },
  { id: 'pdf-numbers', actionId: 'pdf-page-numbers', name: 'Номера страниц', description: 'Добавьте номера на страницы PDF', category: 'pdf-edit', formats: ['pdf'] },
  { id: 'pdf-watermark', actionId: 'pdf-watermark', name: 'Водяной знак', description: 'Наложите текстовый водяной знак', category: 'pdf-edit', formats: ['pdf'] },
  { id: 'pdf-crop', actionId: 'pdf-crop', name: 'Обрезка PDF', description: 'Обрежьте поля страниц документа', category: 'pdf-edit', formats: ['pdf'] },
  { id: 'pdf-annotate', actionId: 'pdf-annotate', name: 'Редактировать PDF', description: 'Добавьте текст и аннотации', category: 'pdf-edit', formats: ['pdf'] },

  // ═══ PDF — Защита ═══
  { id: 'pdf-unlock', actionId: 'pdf-unlock', name: 'Открыть PDF', description: 'Снимите пароль с защищённого PDF', category: 'pdf-protect', formats: ['pdf'] },
  { id: 'pdf-protect', actionId: 'pdf-protect', name: 'Защита PDF', description: 'Установите пароль на PDF-документ', category: 'pdf-protect', formats: ['pdf'] },
  { id: 'pdf-sign', actionId: 'pdf-sign', name: 'Подписать PDF', description: 'Добавьте электронную подпись', category: 'pdf-protect', formats: ['pdf'] },
  { id: 'pdf-redact', actionId: 'pdf-redact', name: 'Скрыть данные', description: 'Замажьте конфиденциальную информацию', category: 'pdf-protect', formats: ['pdf'] },
  { id: 'pdf-compare', actionId: 'pdf-compare', name: 'Сравнить PDF', description: 'Сравните два PDF-документа', category: 'pdf-protect', formats: ['pdf'] },
  { id: 'pdf-meta', actionId: 'pdf-remove-meta', name: 'Удалить метаданные', description: 'Очистите автора, заголовок и теги', category: 'pdf-protect', formats: ['pdf'] },

  // ═══ Документы ═══
  { id: 'docx-to-pdf', actionId: 'doc-to-pdf', name: 'DOCX в PDF', description: 'Конвертируйте Word-документ в PDF', category: 'doc-convert', formats: ['docx','pdf'] },
  { id: 'odt-to-pdf', actionId: 'doc-to-pdf', name: 'ODT в PDF', description: 'Конвертируйте LibreOffice документ в PDF', category: 'doc-convert', formats: ['odt','pdf'] },
  { id: 'rtf-to-pdf', actionId: 'doc-to-pdf', name: 'RTF в PDF', description: 'Конвертируйте RTF в PDF', category: 'doc-convert', formats: ['rtf','pdf'] },
  { id: 'txt-to-pdf', actionId: 'doc-to-pdf', name: 'TXT в PDF', description: 'Конвертируйте текстовый файл в PDF', category: 'doc-convert', formats: ['txt','pdf'] },
  { id: 'md-to-html', actionId: 'md-to-html', name: 'Markdown в HTML', description: 'Конвертируйте Markdown в HTML', category: 'doc-convert', formats: ['md','html'] },
  { id: 'html-to-md', actionId: 'html-to-md', name: 'HTML в Markdown', description: 'Конвертируйте HTML в Markdown', category: 'doc-convert', formats: ['html','md'] },
  { id: 'docx-to-txt', actionId: 'doc-to-txt', name: 'DOCX в TXT', description: 'Извлеките текст из Word-документа', category: 'doc-convert', formats: ['docx','txt'] },
  { id: 'docx-to-odt', actionId: 'doc-to-odt', name: 'DOCX в ODT', description: 'Конвертируйте Word в LibreOffice формат', category: 'doc-convert', formats: ['docx','odt'] },
  { id: 'docx-to-rtf', actionId: 'doc-to-rtf', name: 'DOCX в RTF', description: 'Конвертируйте Word в RTF', category: 'doc-convert', formats: ['docx','rtf'] },
];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const router = useRouter();

  const filtered = activeCategory === 'all' ? TOOLS : TOOLS.filter((t) => t.category === activeCategory);

  return (
    <div className="bg-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="text-hero font-display text-txt-strong mb-3">Инструменты</h1>
          <p className="text-body text-txt-muted max-w-xl mx-auto">
            Все инструменты для работы с PDF, изображениями и документами. Выберите нужный и загрузите файл.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const count = cat.id === 'all' ? TOOLS.length : TOOLS.filter((t) => t.category === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-button text-small font-medium transition-all duration-150',
                  activeCategory === cat.id
                    ? 'bg-accent text-white shadow-button'
                    : 'bg-surface border border-border text-txt-muted hover:text-txt-base hover:border-border-strong',
                )}>
                {cat.label} <span className="text-micro opacity-70 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tool cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((tool) => (
            <button key={tool.id} onClick={() => router.push(`/tool/${tool.id}`)}
              className="card-interactive p-4 text-left flex flex-col gap-2">
              <h3 className="text-small font-semibold text-txt-strong">{tool.name}</h3>
              <p className="text-micro text-txt-muted leading-relaxed flex-1">{tool.description}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tool.formats.map((f) => (
                  <span key={f} className="badge badge-neutral text-micro">{f}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-center text-caption text-txt-faint mt-6">
          {filtered.length} {filtered.length === 1 ? 'инструмент' : 'инструментов'}
        </p>
      </div>
      <Footer />
    </div>
  );
}
