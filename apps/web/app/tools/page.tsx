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
  { id: 'img-resize', actionId: 'resize', name: 'Изменить размер', description: 'Измените ширину и высоту изображения с точностью до пикселя. Поддержка единиц: px, мм, см, дюймы. Сохранение пропорций.', category: 'img-edit', from: 'jpg png webp', to: '' },
  { id: 'img-compress', actionId: 'compress', name: 'Сжать изображение', description: 'Уменьшите размер файла с контролем качества. Настраиваемый ползунок от 1 до 100. Экономия до 80% без видимых потерь.', category: 'img-edit', from: 'jpg png webp', to: '' },
  { id: 'img-remove-bg', actionId: 'remove-bg', name: 'Убрать фон', description: 'Автоматическое удаление фона с ручной дочисткой кистью. Режимы стирания и восстановления. Результат в PNG с прозрачностью.', category: 'img-edit', from: 'jpg png webp avif', to: 'png' },
  { id: 'img-crop', actionId: 'crop', name: 'Обрезать изображение', description: 'Обрежьте края изображения по заданным координатам. Укажите отступы слева, сверху, ширину и высоту области.', category: 'img-edit', from: 'jpg png webp', to: '' },
  { id: 'img-exif', actionId: 'remove-exif', name: 'Удалить EXIF', description: 'Очистите метаданные: GPS-координаты, модель камеры, дату съёмки, настройки экспозиции. Защита приватности.', category: 'img-edit', from: 'jpg png webp tiff', to: '' },

  // ═══ PDF — Организовать ═══
  { id: 'pdf-merge', actionId: 'pdf-merge', name: 'Объединить PDF', description: 'Соедините несколько PDF-файлов в один документ. Расположите в нужном порядке и получите единый файл.', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-split', actionId: 'pdf-split', name: 'Разделить PDF', description: 'Разбейте PDF на отдельные файлы. Каждая страница или диапазон страниц станет отдельным документом.', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-delete', actionId: 'pdf-delete-pages', name: 'Удалить страницы', description: 'Удалите выбранные страницы из PDF. Укажите номера страниц, которые нужно убрать из документа.', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-extract-img', actionId: 'pdf-extract-images', name: 'Извлечь изображения', description: 'Достаньте все картинки из PDF в оригинальном качестве. Каждое изображение сохраняется отдельным файлом.', category: 'pdf-organize', from: 'pdf', to: 'jpg png' },
  { id: 'pdf-reorder', actionId: 'pdf-reorder', name: 'Организовать PDF', description: 'Измените порядок страниц в документе. Перетащите страницы в нужную последовательность.', category: 'pdf-organize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-scan', actionId: 'pdf-scan', name: 'Сканировать в PDF', description: 'Создайте PDF из отсканированных изображений. Объедините сканы в один структурированный документ.', category: 'pdf-organize', from: 'jpg png', to: 'pdf' },

  // ═══ PDF — Оптимизация ═══
  { id: 'pdf-compress', actionId: 'pdf-compress', name: 'Сжать PDF', description: 'Уменьшите размер PDF без потери качества. Три режима: экран (72 dpi), баланс (150 dpi), печать (300 dpi).', category: 'pdf-optimize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-repair', actionId: 'pdf-repair', name: 'Восстановить PDF', description: 'Исправьте повреждённый PDF-файл. Система анализирует структуру документа и пересобирает его.', category: 'pdf-optimize', from: 'pdf', to: 'pdf' },
  { id: 'pdf-ocr', actionId: 'pdf-ocr', name: 'OCR PDF', description: 'Распознайте текст на сканированных страницах. Поддержка русского, английского и немецкого языков.', category: 'pdf-optimize', from: 'pdf', to: 'pdf' },

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

// Category SVG icons — stroke-based, no background
function CatIcon({ category }: { category: string }) {
  const cls = "w-8 h-8 text-steel";
  const props = { width: 32, height: 32, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: cls };

  switch (category) {
    case 'img-convert':
      return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 9l3 3-3 3"/></svg>;
    case 'img-edit':
      return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
    case 'pdf-organize':
      return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>;
    case 'pdf-optimize':
      return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case 'pdf-convert':
      return <svg {...props}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
    case 'pdf-edit':
      return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>;
    case 'pdf-protect':
      return <svg {...props}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
    case 'doc-convert':
      return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
    default:
      return <svg {...props}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>;
  }
}

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const router = useRouter();

  const filtered = activeCategory === 'all' ? TOOLS : TOOLS.filter((t) => t.category === activeCategory);

  return (
    <div className="bg-bg min-h-screen">
      {/* Full width */}
      <div className="px-4 sm:px-6 lg:px-10 xl:px-16 py-10">
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

        {/* Tool cards — full width grid, 5 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((tool) => {
            const fromFmts = tool.from.split(' ').filter(Boolean);
            const toFmts = tool.to.split(' ').filter(Boolean);
            const isConversion = toFmts.length > 0 && fromFmts[0] !== toFmts[0];
            return (
              <button key={tool.id} onClick={() => router.push(`/tool/${tool.id}`)}
                className={cn(
                  'bg-surface rounded-card border p-5 text-left flex flex-col gap-3 min-h-[220px]',
                  'hover:shadow-card-hover hover:border-border-strong hover:-translate-y-1',
                  'transition-all duration-200 cursor-pointer border-border',
                )}>
                <CatIcon category={tool.category} />
                <h3 className="text-body font-semibold text-txt-strong leading-snug">{tool.name}</h3>
                <p className="text-small text-txt-muted leading-relaxed flex-1">{tool.description}</p>

                {/* Format badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isConversion ? (
                    <>
                      {fromFmts.slice(0, 2).map((f) => (
                        <span key={f} className="text-micro text-txt-faint bg-bg-soft px-2 py-0.5 rounded">{f}</span>
                      ))}
                      <span className="text-txt-faint text-micro">→</span>
                      {toFmts.slice(0, 1).map((t) => (
                        <span key={t} className="text-micro text-accent bg-accent-50 px-2 py-0.5 rounded font-medium">{t}</span>
                      ))}
                    </>
                  ) : (
                    fromFmts.slice(0, 3).map((f) => (
                      <span key={f} className="text-micro text-txt-muted bg-bg-soft px-2 py-0.5 rounded">{f}</span>
                    ))
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-caption text-txt-faint mt-8">
          {filtered.length} инструментов
        </p>
      </div>
      <Footer />
    </div>
  );
}
