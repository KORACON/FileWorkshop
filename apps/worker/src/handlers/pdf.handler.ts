/**
 * PDF Handler — полная обработка PDF-файлов.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ Инструмент    │ Операции                                    │
 * ├───────────────┼─────────────────────────────────────────────┤
 * │ pdf-lib (JS)  │ merge, split, extract, rotate, reorder,     │
 * │               │ remove metadata, images→PDF                  │
 * │               │ Быстрый, чистый JS, без системных зависимостей│
 * ├───────────────┼─────────────────────────────────────────────┤
 * │ ghostscript   │ compress                                     │
 * │ (system: gs)  │ Лучшее сжатие PDF с контролем DPI            │
 * ├───────────────┼─────────────────────────────────────────────┤
 * │ poppler-utils │ PDF → PNG/JPG (pdftoppm, pdfinfo)            │
 * │ (system)      │ Быстрая растеризация страниц                 │
 * ├───────────────┼─────────────────────────────────────────────┤
 * │ sharp (JS)    │ Подготовка изображений для images→PDF         │
 * └───────────────┴─────────────────────────────────────────────┘
 *
 * Все операции:
 * - pdf.merge           — объединение нескольких PDF
 * - pdf.split           — разделение на отдельные страницы
 * - pdf.extract_pages   — извлечение выбранных страниц
 * - pdf.rotate          — поворот страниц
 * - pdf.compress        — сжатие через Ghostscript
 * - pdf.from_images     — сборка PDF из изображений
 * - pdf.to_images       — конвертация страниц в PNG/JPG
 * - pdf.remove_metadata — удаление метаданных
 * - pdf.reorder         — перестановка страниц
 */

import { join, basename } from 'path';
import { readFile, writeFile, stat, readdir, mkdir, rm } from 'fs/promises';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { JobContext, JobResult } from '../handler-registry';

const execFileAsync = promisify(execFile);

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────

export async function handlePdfOperation(ctx: JobContext): Promise<JobResult> {
  switch (ctx.job.operationType) {
    case 'pdf.merge':           return pdfMerge(ctx);
    case 'pdf.split':           return pdfSplit(ctx);
    case 'pdf.extract_pages':   return pdfExtractPages(ctx);
    case 'pdf.rotate':          return pdfRotate(ctx);
    case 'pdf.compress':        return pdfCompress(ctx);
    case 'pdf.from_images':     return pdfFromImages(ctx);
    case 'pdf.to_images':       return pdfToImages(ctx);
    case 'pdf.remove_metadata': return pdfRemoveMetadata(ctx);
    case 'pdf.reorder':         return pdfReorder(ctx);
    case 'pdf.add_page_numbers': return pdfAddPageNumbers(ctx);
    case 'pdf.delete_pages':    return pdfDeletePages(ctx);
    case 'pdf.watermark':       return pdfWatermark(ctx);
    case 'pdf.crop':            return pdfCropStub(ctx);
    case 'pdf.protect':         return pdfProtectStub(ctx);
    case 'pdf.unlock':          return pdfUnlockStub(ctx);
    case 'pdf.sign':            return pdfSignStub(ctx);
    case 'pdf.redact':          return pdfRedactStub(ctx);
    case 'pdf.compare':         return pdfCompareStub(ctx);
    case 'pdf.annotate':        return pdfAnnotateStub(ctx);
    case 'pdf.repair':          return pdfRepairStub(ctx);
    case 'pdf.ocr':             return pdfOcrStub(ctx);
    case 'pdf.extract_images':  return pdfExtractImagesStub(ctx);
    case 'pdf.scan':            return pdfScanStub(ctx);
    case 'pdf.to_text':         return pdfToTextStub(ctx);
    case 'pdf.to_docx':         return pdfToDocxStub(ctx);
    case 'pdf.to_pptx':         return pdfToPptxStub(ctx);
    case 'pdf.to_xlsx':         return pdfToXlsxStub(ctx);
    case 'pdf.to_html':         return pdfToHtmlStub(ctx);
    default:
      throw new Error(`Неизвестная PDF-операция: ${ctx.job.operationType}`);
  }
}

// ──────────────────────────────────────────────
// MERGE — объединение нескольких PDF
// ──────────────────────────────────────────────

/**
 * Объединяет несколько PDF в один.
 *
 * Для merge нужны несколько файлов. Два варианта:
 * 1. Batch upload: несколько file_jobs с одним parent job
 * 2. Один ZIP с PDF-файлами внутри
 *
 * На MVP используем вариант: options.additionalFiles содержит
 * JSON-массив путей к дополнительным файлам в original/.
 * Основной файл (job.storedOriginalPath) — первый в списке.
 */
async function pdfMerge(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  // Собираем список файлов для объединения
  const filePaths: string[] = [job.storedOriginalPath];

  if (options.additionalFiles) {
    try {
      const additional = JSON.parse(options.additionalFiles) as string[];
      filePaths.push(...additional);
    } catch {
      throw new Error('Невалидный формат additionalFiles — ожидается JSON-массив путей');
    }
  }

  if (filePaths.length < 2) {
    throw new Error('Для объединения нужно минимум 2 PDF-файла');
  }

  // Ограничение: максимум 50 файлов
  if (filePaths.length > 50) {
    throw new Error('Максимум 50 файлов для объединения');
  }

  const mergedPdf = await PDFDocument.create();

  for (const filePath of filePaths) {
    try {
      const pdfBytes = await readFile(filePath);
      const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pageIndices = sourcePdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    } catch (err: any) {
      throw new Error(`Ошибка чтения PDF ${basename(filePath)}: ${err.message}`);
    }
  }

  const outputBytes = await mergedPdf.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_merged.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// SPLIT — разделение на отдельные страницы
// ──────────────────────────────────────────────

/**
 * Разделяет PDF на отдельные файлы (по одной странице).
 * Результат — ZIP-архив с файлами page_1.pdf, page_2.pdf, ...
 */
async function pdfSplit(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const archiver = require('archiver');
  const { createWriteStream } = require('fs');
  const { job, storageDirs } = ctx;

  const pdfBytes = await readFile(job.storedOriginalPath);
  const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  if (totalPages === 0) throw new Error('PDF не содержит страниц');
  if (totalPages > 500) throw new Error('Максимум 500 страниц для разделения');

  // Создаём временную директорию для страниц
  const tempDir = join(storageDirs.temp, `split-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Извлекаем каждую страницу в отдельный PDF
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
      newPdf.addPage(copiedPage);
      const pageBytes = await newPdf.save();
      await writeFile(join(tempDir, `page_${i + 1}.pdf`), pageBytes);
    }

    // Архивируем в ZIP
    const outputName = `${randomUUID()}.zip`;
    const outputPath = join(storageDirs.processed, outputName);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });

    const outputStat = await stat(outputPath);
    const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

    return {
      outputFilename: `${originalName}_pages.zip`,
      storedOutputPath: outputPath,
      fileSizeAfter: outputStat.size,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ──────────────────────────────────────────────
// EXTRACT PAGES — извлечение выбранных страниц
// ──────────────────────────────────────────────

/**
 * Извлекает указанные страницы в новый PDF.
 * options.pages: "1,3,5-7,10" — номера страниц (1-indexed)
 */
async function pdfExtractPages(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  if (!options.pages) {
    throw new Error('Не указаны номера страниц (параметр pages)');
  }

  const pdfBytes = await readFile(job.storedOriginalPath);
  const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  const pageIndices = parsePageNumbers(options.pages, totalPages);
  if (pageIndices.length === 0) {
    throw new Error(`Не найдены валидные страницы в диапазоне 1-${totalPages}`);
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  const outputBytes = await newPdf.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_pages_${options.pages.replace(/,/g, '_')}.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// ROTATE — поворот страниц
// ──────────────────────────────────────────────

/**
 * Поворачивает страницы PDF.
 * options.rotation: "90" | "180" | "270"
 * options.pages: "1,3,5" — какие страницы (по умолчанию все)
 */
async function pdfRotate(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument, degrees } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  const rotation = parseInt(options.rotation || '90', 10);
  if (![90, 180, 270].includes(rotation)) {
    throw new Error('rotation должен быть 90, 180 или 270');
  }

  const pdfBytes = await readFile(job.storedOriginalPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const allPages = pdfDoc.getPages();

  const pageIndices = options.pages
    ? parsePageNumbers(options.pages, allPages.length)
    : allPages.map((_: unknown, i: number) => i);

  for (const idx of pageIndices) {
    if (idx >= 0 && idx < allPages.length) {
      const page = allPages[idx];
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + rotation) % 360));
    }
  }

  const outputBytes = await pdfDoc.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_rotated.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// COMPRESS — сжатие через Ghostscript
// ──────────────────────────────────────────────

/**
 * Сжимает PDF через Ghostscript.
 * options.quality: "screen" | "ebook" | "printer" | "prepress"
 *
 * screen   — 72 dpi, минимальный размер, для экрана
 * ebook    — 150 dpi, хороший баланс (по умолчанию)
 * printer  — 300 dpi, для печати
 * prepress — 300 dpi+, максимальное качество
 */
async function pdfCompress(ctx: JobContext): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);

  const quality = options.quality || 'ebook';
  const validQualities = ['screen', 'ebook', 'printer', 'prepress'];
  const pdfSettings = validQualities.includes(quality) ? quality : 'ebook';

  try {
    await execFileAsync('gs', [
      '-sDEVICE=pdfwrite',
      `-dPDFSETTINGS=/${pdfSettings}`,
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      '-dCompatibilityLevel=1.5',
      '-dColorImageResolution=150',
      '-dGrayImageResolution=150',
      '-dMonoImageResolution=300',
      `-sOutputFile=${outputPath}`,
      job.storedOriginalPath,
    ], { timeout: 180000 }); // 3 минуты для больших PDF
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('Ghostscript не установлен. Установите: sudo apt install ghostscript');
    }
    throw new Error(`Ошибка сжатия PDF: ${err.stderr || err.message}`);
  }

  const outputStat = await stat(outputPath);
  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_compressed.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// FROM IMAGES — сборка PDF из изображений
// ──────────────────────────────────────────────

/**
 * Собирает PDF из изображений.
 *
 * Входные данные: основной файл — первое изображение,
 * дополнительные — в options.additionalFiles (JSON-массив путей).
 *
 * Каждое изображение = одна страница PDF.
 * Размер страницы подгоняется под размер изображения.
 */
async function pdfFromImages(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;

  // Собираем список изображений
  const imagePaths: string[] = [job.storedOriginalPath];

  if (options.additionalFiles) {
    try {
      const additional = JSON.parse(options.additionalFiles) as string[];
      imagePaths.push(...additional);
    } catch {
      throw new Error('Невалидный формат additionalFiles');
    }
  }

  if (imagePaths.length > 100) {
    throw new Error('Максимум 100 изображений для сборки PDF');
  }

  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    try {
      // Конвертируем в JPG/PNG через sharp для единообразия
      const metadata = await sharp(imgPath).metadata();
      const width = metadata.width || 595;  // A4 width в points при 72dpi
      const height = metadata.height || 842; // A4 height

      // Конвертируем в PNG (pdf-lib поддерживает PNG и JPG embedding)
      const imgBuffer = await sharp(imgPath)
        .png()
        .toBuffer();

      const image = await pdfDoc.embedPng(imgBuffer);

      // Страница по размеру изображения (в points, 1 point = 1/72 inch)
      // Ограничиваем максимальный размер страницы
      const maxDim = 4000;
      let pageWidth = Math.min(width, maxDim);
      let pageHeight = Math.min(height, maxDim);

      // Если изображение слишком большое — масштабируем
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        pageWidth = Math.round(width * scale);
        pageHeight = Math.round(height * scale);
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    } catch (err: any) {
      throw new Error(`Ошибка обработки изображения ${basename(imgPath)}: ${err.message}`);
    }
  }

  const outputBytes = await pdfDoc.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// TO IMAGES — конвертация страниц в PNG/JPG
// ──────────────────────────────────────────────

/**
 * Конвертирует страницы PDF в изображения через poppler-utils (pdftoppm).
 * Результат — ZIP-архив с изображениями.
 *
 * options.format: "png" | "jpg" (по умолчанию png)
 * options.dpi: "150" | "300" (по умолчанию 150)
 * options.pages: "1,3,5-7" — какие страницы (по умолчанию все)
 */
async function pdfToImages(ctx: JobContext): Promise<JobResult> {
  const archiver = require('archiver');
  const { createWriteStream } = require('fs');
  const { job, options, storageDirs } = ctx;

  const format = (options.format || 'png').toLowerCase();
  if (!['png', 'jpg', 'jpeg'].includes(format)) {
    throw new Error('format должен быть png или jpg');
  }

  const dpi = parseInt(options.dpi || '150', 10);
  if (dpi < 72 || dpi > 600) {
    throw new Error('dpi должен быть от 72 до 600');
  }

  // Создаём временную директорию
  const tempDir = join(storageDirs.temp, `pdf2img-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    const args: string[] = [];

    // Формат вывода
    if (format === 'jpg' || format === 'jpeg') {
      args.push('-jpeg');
    } else {
      args.push('-png');
    }

    // DPI
    args.push('-r', String(dpi));

    // Конкретные страницы
    if (options.pages) {
      // pdftoppm поддерживает -f (first) и -l (last) для диапазона
      // Для произвольных страниц — конвертируем все, потом фильтруем
      // Или используем несколько вызовов
      const pageNums = parsePageNumbersRaw(options.pages);
      if (pageNums.length > 0) {
        const minPage = Math.min(...pageNums);
        const maxPage = Math.max(...pageNums);
        args.push('-f', String(minPage), '-l', String(maxPage));
      }
    }

    // Входной файл и префикс выхода
    args.push(job.storedOriginalPath);
    args.push(join(tempDir, 'page'));

    await execFileAsync('pdftoppm', args, { timeout: 180000 });

    // Фильтруем страницы если указаны конкретные
    let imageFiles = await readdir(tempDir);
    imageFiles = imageFiles
      .filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
      .sort();

    if (options.pages) {
      const requestedPages = new Set(parsePageNumbersRaw(options.pages));
      imageFiles = imageFiles.filter((f) => {
        // pdftoppm создаёт файлы вида page-01.png, page-02.png
        const match = f.match(/page-(\d+)/);
        if (match) return requestedPages.has(parseInt(match[1], 10));
        return true;
      });
    }

    if (imageFiles.length === 0) {
      throw new Error('Не удалось извлечь изображения из PDF');
    }

    // Если одна страница — отдаём файл напрямую
    if (imageFiles.length === 1) {
      const singleFile = join(tempDir, imageFiles[0]);
      const outputName = `${randomUUID()}.${format === 'jpeg' ? 'jpg' : format}`;
      const outputPath = join(storageDirs.processed, outputName);
      const { copyFile } = require('fs/promises');
      await copyFile(singleFile, outputPath);
      const outputStat = await stat(outputPath);
      const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

      return {
        outputFilename: `${originalName}_page.${format === 'jpeg' ? 'jpg' : format}`,
        storedOutputPath: outputPath,
        fileSizeAfter: outputStat.size,
      };
    }

    // Несколько страниц — ZIP
    const outputName = `${randomUUID()}.zip`;
    const outputPath = join(storageDirs.processed, outputName);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      for (const file of imageFiles) {
        archive.file(join(tempDir, file), { name: file });
      }
      archive.finalize();
    });

    const outputStat = await stat(outputPath);
    const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

    return {
      outputFilename: `${originalName}_images.zip`,
      storedOutputPath: outputPath,
      fileSizeAfter: outputStat.size,
    };
  } catch (err: any) {
    if (err.code === 'ENOENT' && err.message?.includes('pdftoppm')) {
      throw new Error('poppler-utils не установлен. Установите: sudo apt install poppler-utils');
    }
    throw err;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ──────────────────────────────────────────────
// REMOVE METADATA — удаление метаданных
// ──────────────────────────────────────────────

/**
 * Удаляет все метаданные из PDF:
 * Title, Author, Subject, Keywords, Producer, Creator, дата создания.
 */
async function pdfRemoveMetadata(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const { job, storageDirs } = ctx;

  const pdfBytes = await readFile(job.storedOriginalPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // Очищаем все стандартные метаданные
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  const outputBytes = await pdfDoc.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_clean.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// REORDER — перестановка страниц
// ──────────────────────────────────────────────

/**
 * Переставляет страницы PDF в указанном порядке.
 * options.order: "3,1,2,5,4" — новый порядок страниц (1-indexed)
 *
 * Пример: PDF из 5 страниц, order="3,1,2,5,4"
 * Результат: страница 3 станет первой, 1 — второй, и т.д.
 */
async function pdfReorder(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  if (!options.order) {
    throw new Error('Не указан порядок страниц (параметр order)');
  }

  const pdfBytes = await readFile(job.storedOriginalPath);
  const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  // Парсим порядок
  const order = options.order.split(',').map((s: string) => {
    const num = parseInt(s.trim(), 10);
    if (isNaN(num) || num < 1 || num > totalPages) {
      throw new Error(`Невалидный номер страницы: ${s.trim()} (допустимо 1-${totalPages})`);
    }
    return num - 1; // 0-indexed
  });

  // Проверяем, что все страницы указаны
  if (order.length !== totalPages) {
    throw new Error(
      `Количество страниц в order (${order.length}) не совпадает с количеством в PDF (${totalPages}). Укажите все страницы.`,
    );
  }

  // Проверяем уникальность
  const unique = new Set(order);
  if (unique.size !== order.length) {
    throw new Error('В order есть дублирующиеся номера страниц');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, order);
  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  const outputBytes = await newPdf.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_reordered.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// УТИЛИТЫ
// ──────────────────────────────────────────────

/**
 * Парсит строку номеров страниц в массив 0-indexed индексов.
 * "1,3,5-7,10" → [0, 2, 4, 5, 6, 9]
 */
function parsePageNumbers(input: string, totalPages: number): number[] {
  const result: number[] = [];
  const parts = input.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) continue;

      const from = Math.max(1, start);
      const to = Math.min(end, totalPages);

      for (let i = from; i <= to; i++) {
        result.push(i - 1); // 0-indexed
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        result.push(num - 1);
      }
    }
  }

  return [...new Set(result)].sort((a, b) => a - b);
}

/**
 * Парсит строку номеров страниц в массив 1-indexed номеров.
 * Используется для pdftoppm (который работает с 1-indexed).
 */
function parsePageNumbersRaw(input: string): number[] {
  const result: number[] = [];
  const parts = input.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) continue;
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1) {
        result.push(num);
      }
    }
  }

  return [...new Set(result)].sort((a, b) => a - b);
}

// ──────────────────────────────────────────────
// ADD PAGE NUMBERS — нумерация страниц
// ──────────────────────────────────────────────

async function pdfAddPageNumbers(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  const inputPath = join(storageDirs.original, basename(job.storedOriginalPath));
  const pdfBytes = await readFile(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Parse options
  const position = options.position || 'bottom-center';
  const startNumber = parseInt(options.startNumber || '1', 10);
  const fromPage = Math.max(1, parseInt(options.fromPage || '1', 10));
  const toPage = Math.min(totalPages, parseInt(options.toPage || String(totalPages), 10));
  const fontSize = parseInt(options.fontSize || '12', 10);
  const textTemplate = options.textPreset === 'custom'
    ? (options.customText || '{n}')
    : (options.textPreset || '{n}');
  const isBold = options.bold === 'true';
  const isItalic = options.italic === 'true';
  const margin = options.margin || 'standard';

  // Parse color
  let r = 0, g = 0, b = 0;
  const colorHex = options.textColor || '#000000';
  if (colorHex.startsWith('#') && colorHex.length === 7) {
    r = parseInt(colorHex.slice(1, 3), 16) / 255;
    g = parseInt(colorHex.slice(3, 5), 16) / 255;
    b = parseInt(colorHex.slice(5, 7), 16) / 255;
  }

  // Choose font
  let fontKey = StandardFonts.Helvetica;
  if (isBold && isItalic) fontKey = StandardFonts.HelveticaBoldOblique;
  else if (isBold) fontKey = StandardFonts.HelveticaBold;
  else if (isItalic) fontKey = StandardFonts.HelveticaOblique;

  const fontFamily = options.fontFamily || 'Arial';
  if (fontFamily.includes('Times') || fontFamily.includes('Georgia') || fontFamily.includes('Palatino') || fontFamily.includes('Garamond')) {
    if (isBold && isItalic) fontKey = StandardFonts.TimesRomanBoldItalic;
    else if (isBold) fontKey = StandardFonts.TimesRomanBold;
    else if (isItalic) fontKey = StandardFonts.TimesRomanItalic;
    else fontKey = StandardFonts.TimesRoman;
  } else if (fontFamily.includes('Courier')) {
    if (isBold && isItalic) fontKey = StandardFonts.CourierBoldOblique;
    else if (isBold) fontKey = StandardFonts.CourierBold;
    else if (isItalic) fontKey = StandardFonts.CourierOblique;
    else fontKey = StandardFonts.Courier;
  }

  const font = await pdfDoc.embedFont(fontKey);

  // Margin offsets
  const marginPx = margin === 'closer' ? 40 : margin === 'further' ? 15 : 25;

  for (let i = fromPage - 1; i < toPage && i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNumber = startNumber + (i - (fromPage - 1));
    const text = textTemplate
      .replace(/\{n\}/g, String(pageNumber))
      .replace(/\{p\}/g, String(totalPages))
      .replace(/\{total\}/g, String(totalPages));

    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // Calculate x, y based on position
    let x = 0, y = 0;

    if (position.includes('left')) x = marginPx;
    else if (position.includes('right')) x = width - textWidth - marginPx;
    else x = (width - textWidth) / 2; // center

    if (position.includes('top')) y = height - marginPx;
    else if (position.includes('bottom')) y = marginPx;
    else y = height / 2; // middle

    page.drawText(text, {
      x, y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  const outputBytes = await pdfDoc.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_numbered.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// DELETE PAGES
// ──────────────────────────────────────────────

async function pdfDeletePages(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  const inputPath = join(storageDirs.original, basename(job.storedOriginalPath));
  const pdfBytes = await readFile(inputPath);
  const sourcePdf = await PDFDocument.load(pdfBytes);
  const totalPages = sourcePdf.getPageCount();

  const pagesToDelete = parsePageNumbers(options.pages || '', totalPages);
  const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i)
    .filter((i) => !pagesToDelete.includes(i));

  if (pagesToKeep.length === 0) throw new Error('Нельзя удалить все страницы');

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, pagesToKeep);
  for (const page of copiedPages) newPdf.addPage(page);

  const outputBytes = await newPdf.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');
  return {
    outputFilename: `${originalName}_trimmed.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// WATERMARK
// ──────────────────────────────────────────────

async function pdfWatermark(ctx: JobContext): Promise<JobResult> {
  const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
  const { job, options, storageDirs } = ctx;

  const inputPath = join(storageDirs.original, basename(job.storedOriginalPath));
  const pdfBytes = await readFile(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const text = options.text || 'WATERMARK';
  const opacity = parseInt(options.opacity || '30', 10) / 100;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 8;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: (width - textWidth * 0.7) / 2,
      y: height / 2 - fontSize / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(45),
    });
  }

  const outputBytes = await pdfDoc.save();
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, outputBytes);

  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');
  return {
    outputFilename: `${originalName}_watermarked.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputBytes.length,
  };
}

// ──────────────────────────────────────────────
// STUBS — заглушки для ещё не реализованных операций
// ──────────────────────────────────────────────

async function stubCopyFile(ctx: JobContext, suffix: string): Promise<JobResult> {
  const { job, storageDirs } = ctx;
  const inputPath = join(storageDirs.original, basename(job.storedOriginalPath));
  const pdfBytes = await readFile(inputPath);
  const outputName = `${randomUUID()}.pdf`;
  const outputPath = join(storageDirs.processed, outputName);
  await writeFile(outputPath, pdfBytes);
  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');
  return {
    outputFilename: `${originalName}_${suffix}.pdf`,
    storedOutputPath: outputPath,
    fileSizeAfter: pdfBytes.length,
  };
}

async function pdfCropStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'cropped'); }
async function pdfProtectStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'protected'); }
async function pdfUnlockStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'unlocked'); }
async function pdfSignStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'signed'); }
async function pdfRedactStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'redacted'); }
async function pdfCompareStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'compared'); }
async function pdfAnnotateStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'annotated'); }
async function pdfRepairStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'repaired'); }
async function pdfOcrStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'ocr'); }
async function pdfExtractImagesStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'images'); }
async function pdfScanStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'scanned'); }
async function pdfToTextStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'text'); }
async function pdfToDocxStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'docx'); }
async function pdfToPptxStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'pptx'); }
async function pdfToXlsxStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'xlsx'); }
async function pdfToHtmlStub(ctx: JobContext): Promise<JobResult> { return stubCopyFile(ctx, 'html'); }
