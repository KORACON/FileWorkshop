/**
 * Image Handler — полная обработка изображений.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Инструмент │ Когда использовать                            │
 * ├────────────┼───────────────────────────────────────────────┤
 * │ sharp      │ JPG, PNG, WEBP, AVIF, TIFF, BMP, GIF         │
 * │ (libvips)  │ Быстрый, низкое потребление RAM               │
 * │            │ Resize, compress, rotate, EXIF strip           │
 * │            │ Основной инструмент для 90% операций           │
 * ├────────────┼───────────────────────────────────────────────┤
 * │ ImageMagick│ HEIC → JPG/PNG (sharp может не иметь heif)    │
 * │ (convert)  │ Экзотические форматы                          │
 * │            │ Fallback при ошибках sharp                     │
 * │            │ Медленнее, больше RAM                          │
 * └────────────┴───────────────────────────────────────────────┘
 *
 * Поддерживаемые операции:
 * - image.convert    — конвертация формата
 * - image.resize     — изменение размера
 * - image.compress   — сжатие с контролем качества
 * - image.rotate     — поворот на 90/180/270
 * - image.remove_exif — удаление EXIF/метаданных
 * - image.crop       — обрезка (будущее расширение)
 * - image.batch      — пакетная обработка нескольких файлов
 */

import { join } from 'path';
import { stat, mkdir, readdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import { JobContext, JobResult } from '../handler-registry';

const execFileAsync = promisify(execFile);

// ──────────────────────────────────────────────
// ГЛАВНЫЙ ENTRY POINT
// ──────────────────────────────────────────────

export async function handleImageConvert(ctx: JobContext): Promise<JobResult> {
  const { job } = ctx;
  const operation = job.operationType;

  switch (operation) {
    case 'image.convert':
      return processConvert(ctx);
    case 'image.resize':
      return processResize(ctx);
    case 'image.compress':
      return processCompress(ctx);
    case 'image.rotate':
      return processRotate(ctx);
    case 'image.remove_exif':
      return processRemoveExif(ctx);
    case 'image.crop':
      return processCrop(ctx);
    case 'image.remove_bg':
      return processRemoveBg(ctx);
    default:
      // Fallback: пробуем как convert
      return processConvert(ctx);
  }
}

// ──────────────────────────────────────────────
// КОНВЕРТАЦИЯ ФОРМАТА
// ──────────────────────────────────────────────

async function processConvert(ctx: JobContext): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;
  const inputPath = job.storedOriginalPath;
  const sourceFormat = job.sourceFormat.toLowerCase();
  const targetFormat = (job.targetFormat || job.sourceFormat).toLowerCase();

  // HEIC/HEIF → сначала пробуем sharp, при ошибке — ImageMagick
  if (sourceFormat === 'heic' || sourceFormat === 'heif') {
    return convertWithFallback(ctx, inputPath, targetFormat);
  }

  // Все остальные форматы — sharp
  return convertWithSharp(ctx, inputPath, targetFormat, options);
}

/**
 * Конвертация через sharp.
 * Поддерживает: JPG, PNG, WEBP, AVIF, BMP, TIFF, GIF → любой из них.
 */
async function convertWithSharp(
  ctx: JobContext,
  inputPath: string,
  targetFormat: string,
  options: Record<string, string>,
): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, storageDirs } = ctx;

  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  let pipeline = sharp(inputPath, {
    // Для AVIF/HEIC может потребоваться больше памяти
    limitInputPixels: 268402689, // ~16384x16384
    sequentialRead: true,
  });

  // Автоматический поворот по EXIF перед конвертацией
  pipeline = pipeline.rotate();

  // Применяем дополнительные операции из options
  pipeline = applyOptions(pipeline, options);

  // Формат вывода
  pipeline = applyOutputFormat(pipeline, targetFormat, options);

  const info = await pipeline.toFile(outputPath);
  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

/**
 * Конвертация с fallback на ImageMagick.
 * Используется для HEIC/HEIF и экзотических форматов.
 */
async function convertWithFallback(
  ctx: JobContext,
  inputPath: string,
  targetFormat: string,
): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;

  // Попытка 1: sharp
  try {
    return await convertWithSharp(ctx, inputPath, targetFormat, options);
  } catch (sharpErr: any) {
    console.warn(`[ImageHandler] sharp не смог обработать ${job.sourceFormat}: ${sharpErr.message}. Пробуем ImageMagick...`);
  }

  // Попытка 2: ImageMagick
  return convertWithImageMagick(ctx, inputPath, targetFormat);
}

/**
 * Конвертация через ImageMagick (команда `convert` или `magick`).
 *
 * Когда использовать:
 * - HEIC/HEIF если sharp не собран с поддержкой libheif
 * - Экзотические форматы (ICO, TGA, PSD)
 * - Fallback при любых ошибках sharp
 *
 * Минусы:
 * - Медленнее sharp в 2-5 раз
 * - Больше потребление RAM
 * - Запуск отдельного процесса
 */
async function convertWithImageMagick(
  ctx: JobContext,
  inputPath: string,
  targetFormat: string,
): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;
  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  // Определяем команду: magick (v7) или convert (v6)
  const cmd = await getImageMagickCommand();

  const args: string[] = [];

  // Ограничения ресурсов
  args.push('-limit', 'memory', '256MiB');
  args.push('-limit', 'map', '512MiB');
  args.push('-limit', 'time', '120');

  // Входной файл
  args.push(inputPath);

  // Автоматический поворот по EXIF
  args.push('-auto-orient');

  // Удаление EXIF если запрошено
  if (options.removeExif === 'true') {
    args.push('-strip');
  }

  // Resize
  if (options.width || options.height) {
    const w = options.width || '';
    const h = options.height || '';
    args.push('-resize', `${w}x${h}`);
  }

  // Качество
  if (options.quality) {
    args.push('-quality', options.quality);
  }

  // Выходной файл
  args.push(outputPath);

  await execFileAsync(cmd, args, { timeout: 120000 });

  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// RESIZE
// ──────────────────────────────────────────────

async function processResize(ctx: JobContext): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;
  const targetFormat = (job.targetFormat || job.sourceFormat).toLowerCase();

  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  const width = options.width ? parseInt(options.width, 10) : undefined;
  const height = options.height ? parseInt(options.height, 10) : undefined;

  if (!width && !height) {
    throw new Error('Для resize необходимо указать width и/или height');
  }

  // Валидация размеров
  if (width && (width < 1 || width > 16384)) throw new Error('width должен быть от 1 до 16384');
  if (height && (height < 1 || height > 16384)) throw new Error('height должен быть от 1 до 16384');

  const fit = validateFit(options.fit);

  let pipeline = sharp(job.storedOriginalPath, { sequentialRead: true })
    .rotate() // Авто-поворот по EXIF
    .resize({
      width,
      height,
      fit,
      withoutEnlargement: false, // Пользователь явно задал размер — разрешаем увеличение
      background: options.background
        ? parseColor(options.background)
        : { r: 255, g: 255, b: 255, alpha: 0 },
    });

  pipeline = applyOutputFormat(pipeline, targetFormat, options);
  await pipeline.toFile(outputPath);

  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat, 'resized'),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// COMPRESS
// ──────────────────────────────────────────────

async function processCompress(ctx: JobContext): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;
  const targetFormat = (job.targetFormat || job.sourceFormat).toLowerCase();

  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  // Качество по умолчанию для сжатия — ниже чем для конвертации
  const quality = parseInt(options.quality || '75', 10);
  if (quality < 1 || quality > 100) throw new Error('quality должен быть от 1 до 100');

  let pipeline = sharp(job.storedOriginalPath, { sequentialRead: true })
    .rotate();

  // Для PNG — дополнительные опции сжатия
  const compressOptions = { ...options, quality: String(quality) };

  pipeline = applyOutputFormat(pipeline, targetFormat, compressOptions);
  await pipeline.toFile(outputPath);

  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat, 'compressed'),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// ROTATE
// ──────────────────────────────────────────────

async function processRotate(ctx: JobContext): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;
  const targetFormat = (job.targetFormat || job.sourceFormat).toLowerCase();

  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  const angle = parseInt(options.rotation || '90', 10);
  if (![90, 180, 270].includes(angle)) {
    throw new Error('rotation должен быть 90, 180 или 270');
  }

  let pipeline = sharp(job.storedOriginalPath, { sequentialRead: true })
    .rotate(angle);

  pipeline = applyOutputFormat(pipeline, targetFormat, options);
  await pipeline.toFile(outputPath);

  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat, 'rotated'),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// REMOVE EXIF
// ──────────────────────────────────────────────

async function processRemoveExif(ctx: JobContext): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;
  const targetFormat = (job.targetFormat || job.sourceFormat).toLowerCase();

  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  // rotate() без аргументов: авто-поворот по EXIF, затем strip метаданных
  // withMetadata(false) — не копировать метаданные в результат
  let pipeline = sharp(job.storedOriginalPath, { sequentialRead: true })
    .rotate()
    .withMetadata(false as any); // Удаляем все метаданные

  pipeline = applyOutputFormat(pipeline, targetFormat, options);
  await pipeline.toFile(outputPath);

  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat, 'clean'),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// CROP (обрезка)
// ──────────────────────────────────────────────

async function processCrop(ctx: JobContext): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;
  const targetFormat = (job.targetFormat || job.sourceFormat).toLowerCase();

  const outputName = `${randomUUID()}.${normalizeExt(targetFormat)}`;
  const outputPath = join(storageDirs.processed, outputName);

  const left = parseInt(options.left || '0', 10);
  const top = parseInt(options.top || '0', 10);
  const width = parseInt(options.width || '0', 10);
  const height = parseInt(options.height || '0', 10);

  if (width <= 0 || height <= 0) {
    throw new Error('Для crop необходимо указать width и height > 0');
  }

  let pipeline = sharp(job.storedOriginalPath, { sequentialRead: true })
    .rotate()
    .extract({ left, top, width, height });

  pipeline = applyOutputFormat(pipeline, targetFormat, options);
  await pipeline.toFile(outputPath);

  const outputStat = await stat(outputPath);

  return {
    outputFilename: makeDownloadName(job.originalFilename, targetFormat, 'cropped'),
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// REMOVE BACKGROUND — удаление фона
// ──────────────────────────────────────────────

/**
 * Удаляет фон с изображения.
 *
 * Алгоритм (без внешних API):
 * 1. Определяем цвет фона по углам изображения
 * 2. Создаём маску: пиксели близкие к фону → прозрачные
 * 3. Применяем маску к альфа-каналу
 *
 * Результат всегда PNG (поддерживает прозрачность).
 */
async function processRemoveBg(ctx: JobContext): Promise<JobResult> {
  const sharp = require('sharp');
  const { job, options, storageDirs } = ctx;

  const outputName = `${randomUUID()}.png`;
  const outputPath = join(storageDirs.processed, outputName);

  const threshold = parseInt(options.threshold || '50', 10);

  // Загружаем изображение
  const image = sharp(job.storedOriginalPath);
  const metadata = await image.metadata();
  const { width = 1, height = 1 } = metadata;

  // Получаем raw pixel data (RGBA)
  const rawBuffer = await image
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Определяем цвет фона по углам (среднее 4 углов)
  const getPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return { r: rawBuffer[idx], g: rawBuffer[idx + 1], b: rawBuffer[idx + 2] };
  };

  const corners = [
    getPixel(0, 0),
    getPixel(width - 1, 0),
    getPixel(0, height - 1),
    getPixel(width - 1, height - 1),
  ];

  const bgColor = {
    r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
    g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
    b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
  };

  // Создаём новый буфер с прозрачностью
  const scaledThreshold = threshold * 2.55; // 0-100 → 0-255
  const outputBuffer = Buffer.from(rawBuffer);

  for (let i = 0; i < outputBuffer.length; i += 4) {
    const r = outputBuffer[i];
    const g = outputBuffer[i + 1];
    const b = outputBuffer[i + 2];

    // Расстояние до цвета фона
    const dist = Math.sqrt(
      (r - bgColor.r) ** 2 +
      (g - bgColor.g) ** 2 +
      (b - bgColor.b) ** 2,
    );

    if (dist < scaledThreshold) {
      // Близко к фону → прозрачный
      outputBuffer[i + 3] = 0;
    } else if (dist < scaledThreshold * 1.5) {
      // Переходная зона → полупрозрачный (мягкий край)
      const alpha = Math.round(((dist - scaledThreshold) / (scaledThreshold * 0.5)) * 255);
      outputBuffer[i + 3] = Math.min(255, alpha);
    }
    // Иначе — полностью непрозрачный (alpha = 255, уже в буфере)
  }

  // Сохраняем как PNG с альфа-каналом
  await sharp(outputBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);

  const outputStat = await stat(outputPath);
  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}_no_bg.png`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// УТИЛИТЫ: ФОРМАТ ВЫВОДА
// ──────────────────────────────────────────────

/**
 * Применяет формат вывода к sharp pipeline.
 * Настраивает кодек и параметры качества для каждого формата.
 */
function applyOutputFormat(
  pipeline: any,
  targetFormat: string,
  options: Record<string, string>,
): any {
  const quality = parseInt(options.quality || '85', 10);

  switch (normalizeExt(targetFormat)) {
    case 'jpg':
    case 'jpeg':
      return pipeline.jpeg({
        quality,
        mozjpeg: options.mozjpeg !== 'false', // mozjpeg по умолчанию — лучшее сжатие
        chromaSubsampling: options.chromaSubsampling || '4:2:0',
      });

    case 'png':
      return pipeline.png({
        compressionLevel: parseInt(options.compressionLevel || '6', 10),
        palette: options.palette === 'true', // Палитровый PNG — меньше размер
        effort: parseInt(options.effort || '7', 10),
      });

    case 'webp':
      return pipeline.webp({
        quality,
        lossless: options.lossless === 'true',
        nearLossless: options.nearLossless === 'true',
        effort: parseInt(options.effort || '4', 10),
      });

    case 'avif':
      return pipeline.avif({
        quality,
        lossless: options.lossless === 'true',
        effort: parseInt(options.effort || '4', 10),
      });

    case 'tiff':
      return pipeline.tiff({
        quality,
        compression: (options.compression as any) || 'jpeg',
      });

    case 'gif':
      return pipeline.gif({
        effort: parseInt(options.effort || '7', 10),
      });

    default:
      // Пробуем toFormat как fallback
      return pipeline.toFormat(targetFormat as any, { quality });
  }
}

/**
 * Применяет дополнительные операции из options к pipeline.
 * Используется в convert для комбинированных операций
 * (например: конвертация + resize одновременно).
 */
function applyOptions(pipeline: any, options: Record<string, string>): any {
  // Resize если указаны размеры
  if (options.width || options.height) {
    const width = options.width ? parseInt(options.width, 10) : undefined;
    const height = options.height ? parseInt(options.height, 10) : undefined;
    pipeline = pipeline.resize({
      width,
      height,
      fit: validateFit(options.fit),
      withoutEnlargement: options.withoutEnlargement !== 'false',
    });
  }

  // Поворот
  if (options.rotation) {
    const angle = parseInt(options.rotation, 10);
    if ([90, 180, 270].includes(angle)) {
      pipeline = pipeline.rotate(angle);
    }
  }

  // Удаление метаданных
  if (options.removeExif === 'true') {
    pipeline = pipeline.withMetadata(false as any);
  }

  return pipeline;
}

// ──────────────────────────────────────────────
// УТИЛИТЫ: ОБЩИЕ
// ──────────────────────────────────────────────

/** Нормализация расширения: jpeg → jpg */
function normalizeExt(format: string): string {
  const f = format.toLowerCase().replace('.', '');
  if (f === 'jpeg') return 'jpg';
  if (f === 'tif') return 'tiff';
  if (f === 'heif') return 'heic';
  return f;
}

/** Генерация имени для скачивания */
function makeDownloadName(originalFilename: string, targetFormat: string, suffix?: string): string {
  const name = originalFilename.replace(/\.[^.]+$/, '');
  const safeName = name.substring(0, 200);
  const ext = normalizeExt(targetFormat);
  if (suffix) return `${safeName}_${suffix}.${ext}`;
  return `${safeName}.${ext}`;
}

/** Валидация fit параметра для resize */
function validateFit(fit?: string): string {
  const validFits = ['cover', 'contain', 'fill', 'inside', 'outside'];
  if (fit && validFits.includes(fit)) return fit;
  return 'inside'; // По умолчанию — вписать в размеры без обрезки
}

/** Парсинг цвета из строки (hex или r,g,b) */
function parseColor(color: string): { r: number; g: number; b: number; alpha: number } {
  // Hex: #ffffff или ffffff
  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
      alpha: 1,
    };
  }
  // RGB: 255,255,255
  const parts = color.split(',').map(Number);
  if (parts.length === 3) {
    return { r: parts[0], g: parts[1], b: parts[2], alpha: 1 };
  }
  return { r: 255, g: 255, b: 255, alpha: 0 };
}

/**
 * Определяет доступную команду ImageMagick.
 * v7: `magick`, v6: `convert`
 */
async function getImageMagickCommand(): Promise<string> {
  try {
    await execFileAsync('magick', ['--version'], { timeout: 5000 });
    return 'magick';
  } catch {
    try {
      await execFileAsync('convert', ['--version'], { timeout: 5000 });
      return 'convert';
    } catch {
      throw new Error(
        'ImageMagick не установлен. Установите: sudo apt install imagemagick',
      );
    }
  }
}
