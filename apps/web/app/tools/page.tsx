'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { getActionById } from '@/lib/capability-registry';
import { Footer } from '@/components/layout/footer';

interface ToolCard {
  id: string;
  actionId: string;
  name: string;
  description: string;
  category: string;
  accepts: string[];
  color: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'pdf-organize', label: 'Организовать PDF' },
  { id: 'pdf-optimize', label: 'Оптимизация PDF' },
  { id: 'pdf-convert', label: 'Конвертировать PDF' },
  { id: 'pdf-edit', label: 'Редактировать PDF' },
  { id: 'pdf-protect', label: 'Защита PDF' },
  { id: 'images', label: 'Изображения' },
  { id: 'documents', label: 'Документы' },
];

const TOOLS: ToolCard[] = [
  // PDF — Организовать
  { id: 'merge', actionId: 'pdf-merge', name: 'Объединить PDF', description: 'Объедините несколько PDF-файлов и упорядочьте их в любом порядке', category: 'pdf-organize', accepts: ['pdf'], color: 'text-orange-500' },
  { id: 'split', actionId: 'pdf-split', name: 'Разделить PDF', description: 'Выбирайте диапазон страниц или преобразовывайте каждую страницу в отдельный PDF', category: 'pdf-organize', accepts: ['pdf'], color: 'text-orange-500' },
  { id: 'delete-pages', actionId: 'pdf-delete-pages', name: 'Удалить страницы', description: 'Удалите ненужные страницы из PDF-документа', category: 'pdf-organize', accepts: ['pdf'], color: 'text-orange-500' },
  { id: 'extract-images', actionId: 'pdf-extract-images', name: 'Извлечь изображения', description: 'Извлеките все изображения из PDF-файла', category: 'pdf-organize', accepts: ['pdf'], color: 'text-orange-500' },
  { id: 'reorder', actionId: 'pdf-reorder', name: 'Организовать PDF', description: 'Измените порядок страниц в PDF-документе', category: 'pdf-organize', accepts: ['pdf'], color: 'text-orange-500' },
  // PDF — Оптимизация
  { id: 'compress', actionId: 'pdf-compress', name: 'Сжать PDF', description: 'Уменьшите размер PDF-файла, сохранив качество', category: 'pdf-optimize', accepts: ['pdf'], color: 'text-green-600' },
  { id: 'repair', actionId: 'pdf-repair', name: 'Восстановить PDF', description: 'Попробуйте исправить повреждённый PDF-файл', category: 'pdf-optimize', accepts: ['pdf'], color: 'text-green-600' },
  { id: 'ocr', actionId: 'pdf-ocr', name: 'OCR PDF', description: 'Распознайте текст на отсканированных страницах PDF', category: 'pdf-optimize', accepts: ['pdf'], color: 'text-green-600' },
  // PDF — Конвертировать
  { id: 'pdf-to-word', actionId: 'pdf-to-docx', name: 'PDF в Word', description: 'Конвертируйте PDF в редактируемый документ DOCX', category: 'pdf-convert', accepts: ['pdf'], color: 'text-blue-600' },
  { id: 'pdf-to-ppt', actionId: 'pdf-to-pptx', name: 'PDF в PowerPoint', description: 'Конвертируйте PDF-презентацию в формат PPTX', category: 'pdf-convert', accepts: ['pdf'], color: 'text-blue-600' },
  { id: 'pdf-to-excel', actionId: 'pdf-to-xlsx', name: 'PDF в Excel', description: 'Извлеките таблицы из PDF в формат XLSX', category: 'pdf-convert', accepts: ['pdf'], color: 'text-blue-600' },
  { id: 'pdf-to-jpg', actionId: 'pdf-to-images', name: 'PDF в JPG', description: 'Конвертируйте страницы PDF в изображения', category: 'pdf-convert', accepts: ['pdf'], color: 'text-blue-600' },
  { id: 'pdf-to-html', actionId: 'pdf-to-html', name: 'PDF в HTML', description: 'Преобразуйте PDF в HTML-страницу', category: 'pdf-convert', accepts: ['pdf'], color: 'text-blue-600' },
  { id: 'doc-to-pdf', actionId: 'doc-to-pdf', name: 'Word в PDF', description: 'Конвертируйте документы DOCX и DOC в PDF', category: 'pdf-convert', accepts: ['docx','doc','odt','rtf','txt'], color: 'text-blue-600' },
  { id: 'jpg-to-pdf', actionId: 'images-to-pdf', name: 'JPG в PDF', description: 'Конвертируйте изображения в формат PDF', category: 'pdf-convert', accepts: ['jpg','jpeg','png','webp','bmp','tiff'], color: 'text-blue-600' },
  { id: 'html-to-pdf', actionId: 'doc-to-pdf', name: 'HTML в PDF', description: 'Преобразуйте HTML-страницу в PDF-документ', category: 'pdf-convert', accepts: ['html','htm'], color: 'text-blue-600' },
  // PDF — Редактировать
  { id: 'rotate', actionId: 'pdf-rotate', name: 'Повернуть PDF', description: 'Поверните страницы PDF на 90°, 180° или 270°', category: 'pdf-edit', accepts: ['pdf'], color: 'text-purple-600' },
  { id: 'page-numbers', actionId: 'pdf-page-numbers', name: 'Номера страниц', description: 'Добавьте номера на страницы PDF-документа', category: 'pdf-edit', accepts: ['pdf'], color: 'text-purple-600' },
  { id: 'watermark', actionId: 'pdf-watermark', name: 'Водяной знак', description: 'Наложите текстовый водяной знак на PDF', category: 'pdf-edit', accepts: ['pdf'], color: 'text-purple-600' },
  { id: 'crop-pdf', actionId: 'pdf-crop', name: 'Обрезка PDF', description: 'Обрежьте поля страниц PDF-документа', category: 'pdf-edit', accepts: ['pdf'], color: 'text-purple-600' },
  { id: 'annotate', actionId: 'pdf-annotate', name: 'Редактировать PDF', description: 'Добавьте текст и аннотации к PDF', category: 'pdf-edit', accepts: ['pdf'], color: 'text-purple-600' },
  // PDF — Защита
  { id: 'unlock', actionId: 'pdf-unlock', name: 'Открыть PDF', description: 'Снимите пароль с защищённого PDF', category: 'pdf-protect', accepts: ['pdf'], color: 'text-sky-700' },
  { id: 'protect', actionId: 'pdf-protect', name: 'Защита PDF', description: 'Установите пароль на PDF-документ', category: 'pdf-protect', accepts: ['pdf'], color: 'text-sky-700' },
  { id: 'sign', actionId: 'pdf-sign', name: 'Подписать PDF', description: 'Добавьте электронную подпись к PDF', category: 'pdf-protect', accepts: ['pdf'], color: 'text-sky-700' },
  { id: 'redact', actionId: 'pdf-redact', name: 'Скрыть данные', description: 'Замажьте конфиденциальную информацию в PDF', category: 'pdf-protect', accepts: ['pdf'], color: 'text-sky-700' },
  { id: 'remove-meta', actionId: 'pdf-remove-meta', name: 'Удалить метаданные', description: 'Очистите автора, заголовок и теги из PDF', category: 'pdf-protect', accepts: ['pdf'], color: 'text-sky-700' },
  // Изображения
  { id: 'img-resize', actionId: 'resize', name: 'Изменить размер', description: 'Измените ширину и высоту изображения', category: 'images', accepts: ['jpg','jpeg','png','webp','avif','bmp','tiff'], color: 'text-amber-600' },
  { id: 'img-compress', actionId: 'compress', name: 'Сжать изображение', description: 'Уменьшите размер файла с контролем качества', category: 'images', accepts: ['jpg','jpeg','png','webp'], color: 'text-amber-600' },
  { id: 'img-remove-bg', actionId: 'remove-bg', name: 'Убрать фон', description: 'Удалите задний фон с изображения', category: 'images', accepts: ['jpg','jpeg','png','webp','avif','bmp','tiff','heic','heif','gif'], color: 'text-amber-600' },
  { id: 'img-to-png', actionId: 'to-png', name: 'В PNG', description: 'Конвертируйте изображение в PNG', category: 'images', accepts: ['jpg','jpeg','webp','avif','bmp','tiff','heic','heif','gif','ico','svg'], color: 'text-amber-600' },
  { id: 'img-to-jpg', actionId: 'to-jpg', name: 'В JPG', description: 'Конвертируйте изображение в JPG', category: 'images', accepts: ['png','webp','avif','bmp','tiff','heic','heif','gif','ico','svg'], color: 'text-amber-600' },
  { id: 'img-to-webp', actionId: 'to-webp', name: 'В WEBP', description: 'Конвертируйте изображение в WEBP', category: 'images', accepts: ['jpg','jpeg','png','avif','bmp','tiff','heic','heif','gif'], color: 'text-amber-600' },
  // Документы
  { id: 'doc-to-txt', actionId: 'doc-to-txt', name: 'В TXT', description: 'Извлеките текст из документа', category: 'documents', accepts: ['docx','doc','odt','rtf','pdf','html','htm'], color: 'text-teal-600' },
  { id: 'doc-to-docx', actionId: 'doc-to-docx', name: 'В DOCX', description: 'Конвертируйте документ в формат Word', category: 'documents', accepts: ['doc','odt','rtf','txt','html','htm','md','pdf'], color: 'text-teal-600' },
  { id: 'md-to-html', actionId: 'md-to-html', name: 'Markdown → HTML', description: 'Конвертируйте Markdown в HTML', category: 'documents', accepts: ['md'], color: 'text-teal-600' },
];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const router = useRouter();
  const ws = useWorkspaceStore();

  const filtered = activeCategory === 'all'
    ? TOOLS
    : TOOLS.filter((t) => t.category === activeCategory);

  const handleToolClick = (tool: ToolCard) => {
    // Navigate to tool-specific page
    router.push(`/tool/${tool.id}`);
  };

  return (
    <div className="bg-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-hero font-display text-txt-strong mb-3">Инструменты</h1>
          <p className="text-body text-txt-muted max-w-xl mx-auto">
            Все инструменты для работы с PDF, изображениями и документами в одном месте.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-button text-small font-medium transition-all duration-150',
                activeCategory === cat.id
                  ? 'bg-accent text-white shadow-button'
                  : 'bg-surface border border-border text-txt-muted hover:text-txt-base hover:border-border-strong',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tool cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className="card-interactive p-5 text-left flex flex-col gap-3"
            >
              <div className={cn('text-2xl', tool.color)}>
                <ToolIcon category={tool.category} />
              </div>
              <div>
                <h3 className="text-h3 text-txt-strong mb-1">{tool.name}</h3>
                <p className="text-micro text-txt-muted leading-relaxed">{tool.description}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto">
                {tool.accepts.slice(0, 4).map((ext) => (
                  <span key={ext} className="badge badge-neutral text-micro">{ext}</span>
                ))}
                {tool.accepts.length > 4 && (
                  <span className="badge badge-neutral text-micro">+{tool.accepts.length - 4}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ToolIcon({ category }: { category: string }) {
  switch (category) {
    case 'pdf-organize': return <span>📑</span>;
    case 'pdf-optimize': return <span>⚡</span>;
    case 'pdf-convert': return <span>🔄</span>;
    case 'pdf-edit': return <span>✏️</span>;
    case 'pdf-protect': return <span>🔒</span>;
    case 'images': return <span>🖼</span>;
    case 'documents': return <span>📝</span>;
    default: return <span>📎</span>;
  }
}
