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
  { id: 'audio', label: 'Аудио' },
  { id: 'video', label: 'Видео' },
  { id: 'ebooks', label: 'Электронные книги' },
  { id: 'spreadsheets', label: 'Таблицы' },
  { id: 'presentations', label: 'Презентации' },
  { id: 'archives', label: 'Архивы' },
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

  // ═══ Аудио ═══
  { id: 'mp3-to-wav', actionId: 'audio-convert', name: 'MP3 в WAV', description: 'Конвертируйте MP3 в несжатый WAV формат высокого качества', category: 'audio', from: 'mp3', to: 'wav' },
  { id: 'wav-to-mp3', actionId: 'audio-convert', name: 'WAV в MP3', description: 'Сожмите WAV в компактный MP3 с настройкой битрейта', category: 'audio', from: 'wav', to: 'mp3' },
  { id: 'mp3-to-flac', actionId: 'audio-convert', name: 'MP3 в FLAC', description: 'Конвертируйте MP3 в формат без потерь FLAC', category: 'audio', from: 'mp3', to: 'flac' },
  { id: 'flac-to-mp3', actionId: 'audio-convert', name: 'FLAC в MP3', description: 'Сожмите FLAC в MP3 для экономии места и совместимости', category: 'audio', from: 'flac', to: 'mp3' },
  { id: 'wav-to-flac', actionId: 'audio-convert', name: 'WAV в FLAC', description: 'Сожмите WAV без потерь в формат FLAC', category: 'audio', from: 'wav', to: 'flac' },
  { id: 'mp3-to-ogg', actionId: 'audio-convert', name: 'MP3 в OGG', description: 'Конвертируйте MP3 в открытый формат OGG Vorbis', category: 'audio', from: 'mp3', to: 'ogg' },
  { id: 'ogg-to-mp3', actionId: 'audio-convert', name: 'OGG в MP3', description: 'Конвертируйте OGG Vorbis в универсальный MP3', category: 'audio', from: 'ogg', to: 'mp3' },
  { id: 'mp3-to-aac', actionId: 'audio-convert', name: 'MP3 в AAC', description: 'Конвертируйте MP3 в AAC — преемник MP3 с лучшим качеством', category: 'audio', from: 'mp3', to: 'aac' },
  { id: 'aac-to-mp3', actionId: 'audio-convert', name: 'AAC в MP3', description: 'Конвертируйте AAC в MP3 для максимальной совместимости', category: 'audio', from: 'aac', to: 'mp3' },
  { id: 'wma-to-mp3', actionId: 'audio-convert', name: 'WMA в MP3', description: 'Конвертируйте Windows Media Audio в универсальный MP3', category: 'audio', from: 'wma', to: 'mp3' },
  { id: 'm4a-to-mp3', actionId: 'audio-convert', name: 'M4A в MP3', description: 'Конвертируйте Apple M4A в MP3 для всех устройств', category: 'audio', from: 'm4a', to: 'mp3' },
  { id: 'mp3-to-m4a', actionId: 'audio-convert', name: 'MP3 в M4A', description: 'Конвертируйте MP3 в M4A для Apple устройств', category: 'audio', from: 'mp3', to: 'm4a' },

  // ═══ Видео ═══
  { id: 'mp4-to-avi', actionId: 'video-convert', name: 'MP4 в AVI', description: 'Конвертируйте MP4 в классический формат AVI', category: 'video', from: 'mp4', to: 'avi' },
  { id: 'avi-to-mp4', actionId: 'video-convert', name: 'AVI в MP4', description: 'Конвертируйте AVI в универсальный MP4 для веба', category: 'video', from: 'avi', to: 'mp4' },
  { id: 'mp4-to-mkv', actionId: 'video-convert', name: 'MP4 в MKV', description: 'Конвертируйте MP4 в контейнер Matroska MKV', category: 'video', from: 'mp4', to: 'mkv' },
  { id: 'mkv-to-mp4', actionId: 'video-convert', name: 'MKV в MP4', description: 'Конвертируйте MKV в MP4 для максимальной совместимости', category: 'video', from: 'mkv', to: 'mp4' },
  { id: 'mov-to-mp4', actionId: 'video-convert', name: 'MOV в MP4', description: 'Конвертируйте Apple QuickTime MOV в универсальный MP4', category: 'video', from: 'mov', to: 'mp4' },
  { id: 'mp4-to-webm', actionId: 'video-convert', name: 'MP4 в WEBM', description: 'Конвертируйте MP4 в открытый формат WEBM для веба', category: 'video', from: 'mp4', to: 'webm' },
  { id: 'webm-to-mp4', actionId: 'video-convert', name: 'WEBM в MP4', description: 'Конвертируйте WEBM в MP4 для всех устройств', category: 'video', from: 'webm', to: 'mp4' },
  { id: 'wmv-to-mp4', actionId: 'video-convert', name: 'WMV в MP4', description: 'Конвертируйте Windows Media Video в MP4', category: 'video', from: 'wmv', to: 'mp4' },
  { id: 'flv-to-mp4', actionId: 'video-convert', name: 'FLV в MP4', description: 'Конвертируйте Flash Video в современный MP4', category: 'video', from: 'flv', to: 'mp4' },
  { id: 'mp4-to-gif', actionId: 'video-convert', name: 'MP4 в GIF', description: 'Создайте анимированный GIF из видеофайла MP4', category: 'video', from: 'mp4', to: 'gif' },
  { id: '3gp-to-mp4', actionId: 'video-convert', name: '3GP в MP4', description: 'Конвертируйте мобильный 3GP в универсальный MP4', category: 'video', from: '3gp', to: 'mp4' },

  // ═══ Электронные книги ═══
  { id: 'epub-to-pdf', actionId: 'ebook-convert', name: 'EPUB в PDF', description: 'Конвертируйте электронную книгу EPUB в PDF для печати и чтения', category: 'ebooks', from: 'epub', to: 'pdf' },
  { id: 'epub-to-mobi', actionId: 'ebook-convert', name: 'EPUB в MOBI', description: 'Конвертируйте EPUB в MOBI для Amazon Kindle', category: 'ebooks', from: 'epub', to: 'mobi' },
  { id: 'mobi-to-epub', actionId: 'ebook-convert', name: 'MOBI в EPUB', description: 'Конвертируйте Kindle MOBI в универсальный EPUB', category: 'ebooks', from: 'mobi', to: 'epub' },
  { id: 'mobi-to-pdf', actionId: 'ebook-convert', name: 'MOBI в PDF', description: 'Конвертируйте Kindle MOBI в PDF для чтения на любом устройстве', category: 'ebooks', from: 'mobi', to: 'pdf' },
  { id: 'fb2-to-epub', actionId: 'ebook-convert', name: 'FB2 в EPUB', description: 'Конвертируйте FictionBook в универсальный EPUB', category: 'ebooks', from: 'fb2', to: 'epub' },
  { id: 'fb2-to-pdf', actionId: 'ebook-convert', name: 'FB2 в PDF', description: 'Конвертируйте FictionBook в PDF для печати', category: 'ebooks', from: 'fb2', to: 'pdf' },
  { id: 'epub-to-fb2', actionId: 'ebook-convert', name: 'EPUB в FB2', description: 'Конвертируйте EPUB в формат FictionBook', category: 'ebooks', from: 'epub', to: 'fb2' },
  { id: 'pdf-to-epub', actionId: 'ebook-convert', name: 'PDF в EPUB', description: 'Конвертируйте PDF в электронную книгу EPUB', category: 'ebooks', from: 'pdf', to: 'epub' },
  { id: 'azw3-to-epub', actionId: 'ebook-convert', name: 'AZW3 в EPUB', description: 'Конвертируйте Amazon Kindle AZW3 в EPUB', category: 'ebooks', from: 'azw3', to: 'epub' },

  // ═══ Таблицы ═══
  { id: 'xlsx-to-csv', actionId: 'spreadsheet-convert', name: 'XLSX в CSV', description: 'Конвертируйте Excel-таблицу в текстовый CSV с разделителями', category: 'spreadsheets', from: 'xlsx', to: 'csv' },
  { id: 'csv-to-xlsx', actionId: 'spreadsheet-convert', name: 'CSV в XLSX', description: 'Конвертируйте CSV в полноценную Excel-таблицу', category: 'spreadsheets', from: 'csv', to: 'xlsx' },
  { id: 'xlsx-to-ods', actionId: 'spreadsheet-convert', name: 'XLSX в ODS', description: 'Конвертируйте Excel в открытый формат LibreOffice Calc', category: 'spreadsheets', from: 'xlsx', to: 'ods' },
  { id: 'ods-to-xlsx', actionId: 'spreadsheet-convert', name: 'ODS в XLSX', description: 'Конвертируйте LibreOffice Calc в формат Excel', category: 'spreadsheets', from: 'ods', to: 'xlsx' },
  { id: 'xlsx-to-pdf', actionId: 'spreadsheet-convert', name: 'XLSX в PDF', description: 'Конвертируйте Excel-таблицу в PDF для печати и отправки', category: 'spreadsheets', from: 'xlsx', to: 'pdf' },
  { id: 'xls-to-xlsx', actionId: 'spreadsheet-convert', name: 'XLS в XLSX', description: 'Обновите старый формат Excel до современного XLSX', category: 'spreadsheets', from: 'xls', to: 'xlsx' },

  // ═══ Презентации ═══
  { id: 'pptx-to-pdf', actionId: 'presentation-convert', name: 'PPTX в PDF', description: 'Конвертируйте PowerPoint-презентацию в PDF', category: 'presentations', from: 'pptx', to: 'pdf' },
  { id: 'ppt-to-pptx', actionId: 'presentation-convert', name: 'PPT в PPTX', description: 'Обновите старый формат PowerPoint до современного PPTX', category: 'presentations', from: 'ppt', to: 'pptx' },
  { id: 'pptx-to-odp', actionId: 'presentation-convert', name: 'PPTX в ODP', description: 'Конвертируйте PowerPoint в формат LibreOffice Impress', category: 'presentations', from: 'pptx', to: 'odp' },
  { id: 'odp-to-pptx', actionId: 'presentation-convert', name: 'ODP в PPTX', description: 'Конвертируйте LibreOffice Impress в PowerPoint', category: 'presentations', from: 'odp', to: 'pptx' },
  { id: 'pptx-to-jpg', actionId: 'presentation-convert', name: 'PPTX в JPG', description: 'Конвертируйте слайды презентации в изображения JPG', category: 'presentations', from: 'pptx', to: 'jpg' },

  // ═══ Архивы ═══
  { id: 'zip-extract', actionId: 'archive-extract', name: 'Распаковать ZIP', description: 'Извлеките файлы из ZIP-архива в браузере', category: 'archives', from: 'zip', to: '' },
  { id: 'rar-extract', actionId: 'archive-extract', name: 'Распаковать RAR', description: 'Извлеките файлы из RAR-архива без WinRAR', category: 'archives', from: 'rar', to: '' },
  { id: '7z-extract', actionId: 'archive-extract', name: 'Распаковать 7Z', description: 'Извлеките файлы из 7-Zip архива', category: 'archives', from: '7z', to: '' },
  { id: 'tar-extract', actionId: 'archive-extract', name: 'Распаковать TAR', description: 'Извлеките файлы из TAR-архива (Unix)', category: 'archives', from: 'tar', to: '' },
  { id: 'create-zip', actionId: 'archive-create', name: 'Создать ZIP', description: 'Упакуйте файлы в ZIP-архив для отправки и хранения', category: 'archives', from: '', to: 'zip' },
];

// Category SVG icons — colored with background squares
function CatIcon({ category }: { category: string }) {
  switch (category) {
    case 'img-convert':
      return (
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 9l3 3-3 3"/>
          </svg>
        </div>
      );
    case 'img-edit':
      return (
        <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
      );
    case 'pdf-organize':
      return (
        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/>
          </svg>
        </div>
      );
    case 'pdf-optimize':
      return (
        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
      );
    case 'pdf-convert':
      return (
        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
        </div>
      );
    case 'pdf-edit':
      return (
        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
          </svg>
        </div>
      );
    case 'pdf-protect':
      return (
        <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
      );
    case 'doc-convert':
      return (
        <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>
          </svg>
        </div>
      );
    case 'audio':
      return (
        <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
      );
    case 'video':
      return (
        <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M10 8l6 4-6 4V8z"/>
          </svg>
        </div>
      );
    case 'ebooks':
      return (
        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
        </div>
      );
    case 'spreadsheets':
      return (
        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>
          </svg>
        </div>
      );
    case 'presentations':
      return (
        <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
          </svg>
        </div>
      );
    case 'archives':
      return (
        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-12 h-12 rounded-xl bg-gray-400 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/>
          </svg>
        </div>
      );
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
