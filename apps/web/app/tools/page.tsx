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
  from: string;
  to: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'img-convert', label: 'Конвертация изображений' },
  { id: 'img-edit', label: 'Обработка изображений' },
  { id: 'pdf-organize', label: 'Организовать PDF' },
  { id: 'pdf-optimize', label: 'Оптимизация PDF' },
  { id: 'pdf-convert', label: 'Конвертировать PDF' },
  { id: 'pdf-edit', label: 'Редактировать PDF' },
  { id: 'pdf-protect', label: 'Защита PDF' },
  { id: 'doc-convert', label: 'Документы' },
];

// ═══ Image conversions — unique pairs only ═══
const IMG_SOURCES = ['JPG', 'PNG', 'WEBP', 'AVIF', 'GIF', 'BMP', 'TIFF', 'HEIC', 'SVG', 'ICO'];
const IMG_TARGETS: Record<string, { actionId: string; sources: string[] }> = {
  'JPG':  { actionId: 'to-jpg',  sources: ['PNG','WEBP','AVIF','GIF','BMP','TIFF','HEIC','SVG','ICO'] },
  'PNG':  { actionId: 'to-png',  sources: ['JPG','WEBP','AVIF','GIF','BMP','TIFF','HEIC','SVG','ICO'] },
  'WEBP': { actionId: 'to-webp', sources: ['JPG','PNG','AVIF','GIF','BMP','TIFF','HEIC'] },
  'AVIF': { actionId: 'to-avif', sources: ['JPG','PNG','WEBP','GIF','BMP','TIFF','HEIC'] },
  'GIF':  { actionId: 'to-gif',  sources: ['JPG','PNG','WEBP','AVIF','BMP','TIFF','HEIC'] },
  'TIFF': { actionId: 'to-tiff', sources: ['JPG','PNG','WEBP','AVIF','GIF','BMP','HEIC'] },
  'PDF':  { actionId: 'images-to-pdf', sources: ['JPG','PNG','WEBP','BMP','TIFF'] },
};

const imgConversions: ToolCard[] = [];
const seenImg = new Set<string>();
for (const [target, info] of Object.entries(IMG_TARGETS)) {
  for (const src of info.sources) {
    const key = `${src}-${target}`;
    if (seenImg.has(key)) continue;
    seenImg.add(key);
    imgConversions.push({
      id: `${src.toLowerCase()}-to-${target.toLowerCase()}`,
      actionId: info.actionId,
      name: `${src} в ${target}`,
      description: `Конвертировать формат ${src} в ${target}`,
      category: 'img-convert',
      from: src.toLowerCase(),
      to: target.toLowerCase(),
    });
  }
}

const TOOLS: ToolCard[] = [
  ...imgConversions,

  // ═══ Обработка изображений ═══
  { id: 'img-resize', actionId: 'resize', name: 'Изменить размер', description: 'Измените ширину и высоту изображения с точностью до пикселя', category: 'img-edit', from: 'jpg png webp', to: '' },
  { id: 'img-compress', actionId: 'compress', name: 'Сжать изображение', description: 'Уменьшите размер файла с контролем качества', category: 'img-edit', from: 'jpg png webp', to: '' },
  { id: 'img-remove-bg', actionId: 'remove-bg', name: 'Убрать фон', description: 'Удалите задний фон с изображения с ручной дочисткой кистью', category: 'img-edit', from: 'jpg png webp avif', to: 'png' },
  { id: 'img-crop', actionId: 'crop', name: 'Обрезать изображение', description: 'Обрежьте края изображения по заданным координатам', category: 'img-edit', from: 'jpg png webp', to: '' },
  { id: 'img-exif', actionId: 'remove-exif', name: 'Удалить EXIF', description: 'Убрать метаданные: GPS, камеру, дату съёмки', category: 'img-edit', from: 'jpg png webp tiff', to: '' },

  // ═══ PDF — Организовать ═══
  { id: 'pdf-merge', actionId: 'pdf-merge', name: 'Объединить PDF', description: 'Соедините несколько PDF-файлов в один документ', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-split', actionId: 'pdf-split', name: 'Разделить PDF', description: 'Разбейте PDF на отдельные файлы по страницам', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-delete', actionId: 'pdf-delete-pages', name: 'Удалить страницы', description: 'Удалите выбранные страницы из PDF-документа', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-extract-img', actionId: 'pdf-extract-images', name: 'Извлечь изображения', description: 'Достаньте все картинки из PDF-файла', category: 'pdf-organize', from: 'pdf', to: 'jpg png' },
  { id: 'pdf-reorder', actionId: 'pdf-reorder', name: 'Организовать PDF', description: 'Измените порядок страниц в документе', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-scan', actionId: 'pdf-scan', name: 'Сканировать в PDF', description: 'Создайте PDF из отсканированных изображений', category: 'pdf-organize', from: 'jpg png', to: 'pdf' },

  // ═══ PDF — Оптимизация ═══
  { id: 'pdf-compress', actionId: 'pdf-compress', name: 'Сжать PDF', description: 'Уменьшите размер PDF без заметной потери качества', category: 'pdf-optimize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-repair', actionId: 'pdf-repair', name: 'Восстановить PDF', description: 'Исправьте повреждённый PDF-файл', category: 'pdf-optimize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-ocr', actionId: 'pdf-ocr', name: 'OCR PDF', description: 'Распознайте текст на отсканированных страницах', category: 'pdf-optimize', from: 'pdf', to: 'pdf' },

  // ═══ PDF — Конвертировать ═══
  { id: 'pdf-to-word', actionId: 'pdf-to-docx', name: 'PDF в Word', description: 'Конвертируйте PDF в редактируемый документ DOCX', category: 'pdf-convert', from: 'pdf', to: 'docx' },
  { id: 'pdf-to-ppt', actionId: 'pdf-to-pptx', name: 'PDF в PowerPoint', description: 'Конвертируйте PDF-презентацию в формат PPTX', category: 'pdf-convert', from: 'pdf', to: 'pptx' },
  { id: 'pdf-to-excel', actionId: 'pdf-to-xlsx', name: 'PDF в Excel', description: 'Извлеките таблицы из PDF в формат XLSX', category: 'pdf-convert', from: 'pdf', to: 'xlsx' },
  { id: 'pdf-to-jpg', actionId: 'pdf-to-images', name: 'PDF в JPG', description: 'Конвертируйте страницы PDF в изображения', category: 'pdf-convert', from: 'pdf', to: 'jpg' },
  { id: 'pdf-to-html', actionId: 'pdf-to-html', name: 'PDF в HTML', description: 'Преобразуйте PDF в HTML-страницу', category: 'pdf-convert', from: 'pdf', to: 'html' },
  { id: 'pdf-to-txt', actionId: 'pdf-to-txt', name: 'PDF в TXT', description: 'Извлеките весь текст из PDF-документа', category: 'pdf-convert', from: 'pdf', to: 'txt' },
  { id: 'word-to-pdf', actionId: 'doc-to-pdf', name: 'Word в PDF', description: 'Конвертируйте документы DOCX и DOC в PDF', category: 'pdf-convert', from: 'docx', to: 'pdf' },
  { id: 'ppt-to-pdf', actionId: 'doc-to-pdf', name: 'PowerPoint в PDF', description: 'Конвертируйте презентации PPT/PPTX в PDF', category: 'pdf-convert', from: 'pptx', to: 'pdf' },
  { id: 'excel-to-pdf', actionId: 'doc-to-pdf', name: 'Excel в PDF', description: 'Конвертируйте таблицы XLSX/XLS в PDF', category: 'pdf-convert', from: 'xlsx', to: 'pdf' },
  { id: 'html-to-pdf', actionId: 'doc-to-pdf', name: 'HTML в PDF', description: 'Преобразуйте HTML-страницу в PDF-документ', category: 'pdf-convert', from: 'html', to: 'pdf' },

  // ═══ PDF — Редактировать ═══
  { id: 'pdf-rotate', actionId: 'pdf-rotate', name: 'Повернуть PDF', description: 'Поверните страницы на 90°, 180° или 270°', category: 'pdf-edit', from: 'pdf', to: 'pdf' },
  { id: 'pdf-numbers', actionId: 'pdf-page-numbers', name: 'Номера страниц', description: 'Добавьте номера на страницы PDF-документа', category: 'pdf-edit', from: 'pdf', to: 'pdf' },
  { id: 'pdf-watermark', actionId: 'pdf-watermark', name: 'Водяной знак', description: 'Наложите текстовый водяной знак на все страницы', category: 'pdf-edit', from: 'pdf', to: 'pdf' },
  { id: 'pdf-crop', actionId: 'pdf-crop', name: 'Обрезка PDF', description: 'Обрежьте поля страниц PDF-документа', category: 'pdf-edit', from: 'pdf', to: 'pdf' },
  { id: 'pdf-annotate', actionId: 'pdf-annotate', name: 'Редактировать PDF', description: 'Добавьте текст, аннотации и пометки', category: 'pdf-edit', from: 'pdf', to: 'pdf' },

  // ═══ PDF — Защита ═══
  { id: 'pdf-unlock', actionId: 'pdf-unlock', name: 'Открыть PDF', description: 'Снимите пароль с защищённого PDF-документа', category: 'pdf-protect', from: 'pdf', to: 'pdf' },
  { id: 'pdf-protect', actionId: 'pdf-protect', name: 'Защита PDF', description: 'Установите пароль на открытие PDF', category: 'pdf-protect', from: 'pdf', to: 'pdf' },
  { id: 'pdf-sign', actionId: 'pdf-sign', name: 'Подписать PDF', description: 'Добавьте электронную подпись к документу', category: 'pdf-protect', from: 'pdf', to: 'pdf' },
  { id: 'pdf-redact', actionId: 'pdf-redact', name: 'Скрыть данные', description: 'Замажьте конфиденциальную информацию в PDF', category: 'pdf-protect', from: 'pdf', to: 'pdf' },
  { id: 'pdf-compare', actionId: 'pdf-compare', name: 'Сравнить PDF', description: 'Сравните два PDF-документа и найдите различия', category: 'pdf-protect', from: 'pdf', to: '' },
  { id: 'pdf-meta', actionId: 'pdf-remove-meta', name: 'Удалить метаданные', description: 'Очистите автора, заголовок и теги из PDF', category: 'pdf-protect', from: 'pdf', to: 'pdf' },

  // ═══ Документы ═══
  { id: 'docx-to-pdf', actionId: 'doc-to-pdf', name: 'DOCX в PDF', description: 'Конвертируйте Word-документ в PDF', category: 'doc-convert', from: 'docx', to: 'pdf' },
  { id: 'odt-to-pdf', actionId: 'doc-to-pdf', name: 'ODT в PDF', description: 'Конвертируйте LibreOffice документ в PDF', category: 'doc-convert', from: 'odt', to: 'pdf' },
  { id: 'rtf-to-pdf', actionId: 'doc-to-pdf', name: 'RTF в PDF', description: 'Конвертируйте RTF-документ в PDF', category: 'doc-convert', from: 'rtf', to: 'pdf' },
  { id: 'txt-to-pdf', actionId: 'doc-to-pdf', name: 'TXT в PDF', description: 'Конвертируйте текстовый файл в PDF', category: 'doc-convert', from: 'txt', to: 'pdf' },
  { id: 'md-to-html', actionId: 'md-to-html', name: 'Markdown в HTML', description: 'Конвертируйте Markdown в HTML-страницу', category: 'doc-convert', from: 'md', to: 'html' },
  { id: 'html-to-md', actionId: 'html-to-md', name: 'HTML в Markdown', description: 'Конвертируйте HTML в Markdown', category: 'doc-convert', from: 'html', to: 'md' },
  { id: 'docx-to-txt', actionId: 'doc-to-txt', name: 'DOCX в TXT', description: 'Извлеките чистый текст из Word-документа', category: 'doc-convert', from: 'docx', to: 'txt' },
  { id: 'docx-to-odt', actionId: 'doc-to-odt', name: 'DOCX в ODT', description: 'Конвертируйте Word в формат LibreOffice', category: 'doc-convert', from: 'docx', to: 'odt' },
  { id: 'docx-to-rtf', actionId: 'doc-to-rtf', name: 'DOCX в RTF', description: 'Конвертируйте Word в RTF', category: 'doc-convert', from: 'docx', to: 'rtf' },
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
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => {
            const count = cat.id === 'all' ? TOOLS.length : TOOLS.filter((t) => t.category === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-button text-small font-medium transition-all duration-150',
                  activeCategory === cat.id
                    ? 'bg-accent text-white shadow-button'
                    : 'bg-surface border border-border text-txt-muted hover:text-txt-base hover:border-border-strong',
                )}>
                {cat.label} <span className="text-micro opacity-60 ml-0.5">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tool cards — bigger, uniform height */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((tool) => (
            <button key={tool.id} onClick={() => router.push(`/tool/${tool.id}`)}
              className="card-interactive p-5 text-left flex flex-col gap-3 min-h-[140px]">
              <h3 className="text-h3 text-txt-strong">{tool.name}</h3>
              <p className="text-small text-txt-muted leading-relaxed flex-1">{tool.description}</p>
              {(tool.from || tool.to) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tool.from.split(' ').filter(Boolean).slice(0, 3).map((f) => (
                    <span key={f} className="badge badge-neutral text-micro">{f}</span>
                  ))}
                  {tool.to && (
                    <>
                      <span className="text-txt-faint text-micro">→</span>
                      {tool.to.split(' ').filter(Boolean).slice(0, 2).map((t) => (
                        <span key={t} className="badge badge-info text-micro">{t}</span>
                      ))}
                    </>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-caption text-txt-faint mt-8">
          {filtered.length} инструментов
        </p>
      </div>
      <Footer />
    </div>
  );
}
