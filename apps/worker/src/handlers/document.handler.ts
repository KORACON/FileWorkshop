/**
 * Document Handler — конвертация документов.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ Инструмент          │ Конвертации                               │
 * ├─────────────────────┼──────────────────────────────────────────┤
 * │ LibreOffice headless │ DOCX→PDF, ODT→PDF, RTF→PDF, TXT→PDF,   │
 * │                      │ HTML→PDF, DOCX→TXT, ODT→TXT             │
 * │                      │ Лучшее качество для офисных форматов     │
 * ├─────────────────────┼──────────────────────────────────────────┤
 * │ Pandoc               │ Markdown→HTML, Markdown→PDF,             │
 * │                      │ HTML→Markdown, TXT→DOCX                  │
 * │                      │ Лучший для текстовых/разметочных форматов│
 * └─────────────────────┴──────────────────────────────────────────┘
 *
 * Принцип маршрутизации:
 * 1. Определяем пару source:target
 * 2. Выбираем инструмент по таблице конвертаций
 * 3. Если пара не поддерживается — ERROR
 *
 * Все конвертации MVP:
 * DOCX → PDF  (LibreOffice)
 * ODT  → PDF  (LibreOffice)
 * RTF  → PDF  (LibreOffice)
 * TXT  → PDF  (LibreOffice)
 * HTML → PDF  (LibreOffice)
 * DOCX → TXT  (LibreOffice)
 * ODT  → TXT  (LibreOffice)
 * MD   → PDF  (Pandoc)
 * MD   → HTML (Pandoc)
 * HTML → MD   (Pandoc)
 * TXT  → DOCX (Pandoc)
 */

import { join, basename } from 'path';
import { stat, copyFile, rm, mkdir, access } from 'fs/promises';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { JobContext, JobResult } from '../handler-registry';

const execFileAsync = promisify(execFile);

// ──────────────────────────────────────────────
// ТАБЛИЦА КОНВЕРТАЦИЙ
// ──────────────────────────────────────────────

type ConversionTool = 'libreoffice' | 'pandoc';

interface ConversionRoute {
  tool: ConversionTool;
  /** Формат вывода для LibreOffice (--convert-to) */
  loFormat?: string;
  /** Формат ввода для Pandoc (-f) */
  pandocFrom?: string;
  /** Формат вывода для Pandoc (-t) */
  pandocTo?: string;
  /** Расширение выходного файла */
  outputExt: string;
}

/**
 * Полная таблица поддерживаемых конвертаций.
 * Ключ: "sourceFormat:targetFormat"
 *
 * Для добавления новой конвертации — добавить строку сюда.
 * Код обработки менять не нужно.
 */
const CONVERSION_TABLE: Record<string, ConversionRoute> = {
  // ── LibreOffice: офисные форматы → PDF ──
  'docx:pdf': { tool: 'libreoffice', loFormat: 'pdf', outputExt: 'pdf' },
  'odt:pdf':  { tool: 'libreoffice', loFormat: 'pdf', outputExt: 'pdf' },
  'rtf:pdf':  { tool: 'libreoffice', loFormat: 'pdf', outputExt: 'pdf' },
  'txt:pdf':  { tool: 'libreoffice', loFormat: 'pdf', outputExt: 'pdf' },
  'html:pdf': { tool: 'libreoffice', loFormat: 'pdf', outputExt: 'pdf' },
  'htm:pdf':  { tool: 'libreoffice', loFormat: 'pdf', outputExt: 'pdf' },

  // ── LibreOffice: офисные форматы → TXT ──
  'docx:txt': { tool: 'libreoffice', loFormat: 'txt:Text', outputExt: 'txt' },
  'odt:txt':  { tool: 'libreoffice', loFormat: 'txt:Text', outputExt: 'txt' },

  // ── Pandoc: Markdown ──
  'md:html':     { tool: 'pandoc', pandocFrom: 'markdown', pandocTo: 'html',     outputExt: 'html' },
  'md:pdf':      { tool: 'pandoc', pandocFrom: 'markdown', pandocTo: 'pdf',      outputExt: 'pdf' },
  'markdown:html': { tool: 'pandoc', pandocFrom: 'markdown', pandocTo: 'html',   outputExt: 'html' },
  'markdown:pdf':  { tool: 'pandoc', pandocFrom: 'markdown', pandocTo: 'pdf',    outputExt: 'pdf' },

  // ── Pandoc: HTML → Markdown ──
  'html:md':       { tool: 'pandoc', pandocFrom: 'html', pandocTo: 'markdown',   outputExt: 'md' },
  'html:markdown': { tool: 'pandoc', pandocFrom: 'html', pandocTo: 'markdown',   outputExt: 'md' },
  'htm:md':        { tool: 'pandoc', pandocFrom: 'html', pandocTo: 'markdown',   outputExt: 'md' },
  'htm:markdown':  { tool: 'pandoc', pandocFrom: 'html', pandocTo: 'markdown',   outputExt: 'md' },

  // ── Pandoc: TXT → DOCX ──
  'txt:docx': { tool: 'pandoc', pandocFrom: 'plain', pandocTo: 'docx', outputExt: 'docx' },
};

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────

export async function handleDocConvert(ctx: JobContext): Promise<JobResult> {
  const { job } = ctx;
  const source = job.sourceFormat.toLowerCase();
  const target = (job.targetFormat || 'pdf').toLowerCase();
  const key = `${source}:${target}`;

  const route = CONVERSION_TABLE[key];
  if (!route) {
    const supported = Object.keys(CONVERSION_TABLE)
      .map((k) => k.replace(':', ' → '))
      .join(', ');
    throw new Error(
      `Конвертация ${source} → ${target} не поддерживается. Доступные: ${supported}`,
    );
  }

  switch (route.tool) {
    case 'libreoffice':
      return convertWithLibreOffice(ctx, route);
    case 'pandoc':
      return convertWithPandoc(ctx, route);
    default:
      throw new Error(`Неизвестный инструмент: ${route.tool}`);
  }
}

// ──────────────────────────────────────────────
// LIBREOFFICE HEADLESS
// ──────────────────────────────────────────────

/**
 * Конвертация через LibreOffice headless.
 *
 * Особенности:
 * 1. LibreOffice определяет входной формат по расширению файла,
 *    поэтому копируем файл с правильным расширением
 * 2. Каждый вызов использует уникальный UserInstallation profile,
 *    иначе параллельные конвертации конфликтуют (lock файлы)
 * 3. Таймаут 120 сек — DOCX с тяжёлыми таблицами может быть медленным
 * 4. HOME переопределяется на temp — LibreOffice пишет туда кэш
 */
async function convertWithLibreOffice(
  ctx: JobContext,
  route: ConversionRoute,
): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;

  // Проверяем доступность LibreOffice
  await assertCommandExists('libreoffice', 'LibreOffice не установлен. Установите: sudo apt install libreoffice');

  // Уникальный profile для параллельных конвертаций
  const profileDir = join(storageDirs.temp, `lo-profile-${randomUUID()}`);
  await mkdir(profileDir, { recursive: true });

  // Копируем файл с правильным расширением
  const tempInputName = `${randomUUID()}.${job.sourceFormat}`;
  const tempInputPath = join(storageDirs.temp, tempInputName);
  await copyFile(job.storedOriginalPath, tempInputPath);

  // Таймаут из options или 120 сек по умолчанию
  const timeout = parseInt(options.timeout || '120000', 10);

  try {
    const args = [
      '--headless',
      '--norestore',
      '--nolockcheck',
      `--env:UserInstallation=file://${profileDir}`,
      '--convert-to', route.loFormat!,
      '--outdir', storageDirs.processed,
      tempInputPath,
    ];

    const result = await execFileAsync('libreoffice', args, {
      timeout,
      env: {
        ...process.env,
        HOME: storageDirs.temp,
        // Отключаем Java в LibreOffice — ускоряет запуск
        SAL_USE_VCLPLUGIN: 'gen',
      },
    });

    // LibreOffice создаёт файл: <inputName>.<outputExt>
    // Например: uuid.docx → uuid.pdf
    const expectedOutputName = tempInputName.replace(
      /\.[^.]+$/,
      `.${route.outputExt}`,
    );
    const outputPath = join(storageDirs.processed, expectedOutputName);

    // Проверяем, что файл создан
    try {
      await access(outputPath);
    } catch {
      // LibreOffice мог создать файл с другим именем при txt:Text
      // Пробуем найти файл с нужным расширением
      const { readdir } = require('fs/promises');
      const files = await readdir(storageDirs.processed);
      const uuidPrefix = tempInputName.replace(/\.[^.]+$/, '');
      const found = files.find((f: string) => f.startsWith(uuidPrefix));

      if (found) {
        const actualPath = join(storageDirs.processed, found);
        // Если расширение не совпадает — переименовываем
        if (found !== expectedOutputName) {
          const { rename } = require('fs/promises');
          await rename(actualPath, outputPath);
        }
      } else {
        throw new Error(
          `LibreOffice не создал выходной файл. Stderr: ${result.stderr || 'пусто'}`,
        );
      }
    }

    const outputStat = await stat(outputPath);
    const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

    return {
      outputFilename: `${originalName}.${route.outputExt}`,
      storedOutputPath: outputPath,
      fileSizeAfter: outputStat.size,
    };
  } catch (err: any) {
    // Улучшаем сообщение об ошибке
    if (err.killed) {
      throw new Error(`Таймаут конвертации LibreOffice (${timeout / 1000}с). Файл слишком большой или сложный.`);
    }
    if (err.code === 'ENOENT') {
      throw new Error('LibreOffice не установлен. Установите: sudo apt install libreoffice');
    }
    throw new Error(`Ошибка LibreOffice: ${err.stderr || err.message}`);
  } finally {
    // Очистка временных файлов
    await rm(tempInputPath, { force: true }).catch(() => {});
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ──────────────────────────────────────────────
// PANDOC
// ──────────────────────────────────────────────

/**
 * Конвертация через Pandoc.
 *
 * Особенности:
 * 1. Pandoc — лучший инструмент для Markdown, HTML, plain text
 * 2. Для PDF-вывода Pandoc использует LaTeX (pdflatex/xelatex)
 *    или wkhtmltopdf. Если LaTeX не установлен — fallback на LibreOffice
 * 3. --standalone — генерирует полный документ (с <html>, <head>)
 * 4. --wrap=auto — автоматический перенос строк
 */
async function convertWithPandoc(
  ctx: JobContext,
  route: ConversionRoute,
): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;

  // Проверяем доступность Pandoc
  await assertCommandExists('pandoc', 'Pandoc не установлен. Установите: sudo apt install pandoc');

  const outputName = `${randomUUID()}.${route.outputExt}`;
  const outputPath = join(storageDirs.processed, outputName);

  // Для Markdown → PDF: Pandoc нужен LaTeX engine
  // Если нет — пробуем через промежуточный HTML + LibreOffice
  if (route.pandocTo === 'pdf') {
    return convertMarkdownToPdf(ctx, route, outputPath);
  }

  const timeout = parseInt(options.timeout || '60000', 10);

  const args: string[] = [
    job.storedOriginalPath,
    '-f', route.pandocFrom!,
    '-t', route.pandocTo!,
    '-o', outputPath,
    '--standalone',
    '--wrap=auto',
  ];

  // Дополнительные опции для HTML-вывода
  if (route.pandocTo === 'html') {
    args.push('--metadata', 'title=Converted Document');
    // Кодировка
    if (options.charset) {
      args.push('--metadata', `charset=${options.charset}`);
    }
  }

  // Для DOCX-вывода можно указать reference doc (шаблон)
  if (route.pandocTo === 'docx' && options.referenceDoc) {
    args.push('--reference-doc', options.referenceDoc);
  }

  try {
    await execFileAsync('pandoc', args, { timeout });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('Pandoc не установлен. Установите: sudo apt install pandoc');
    }
    if (err.killed) {
      throw new Error(`Таймаут конвертации Pandoc (${timeout / 1000}с)`);
    }
    throw new Error(`Ошибка Pandoc: ${err.stderr || err.message}`);
  }

  // Проверяем результат
  try {
    await access(outputPath);
  } catch {
    throw new Error('Pandoc не создал выходной файл');
  }

  const outputStat = await stat(outputPath);
  const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

  return {
    outputFilename: `${originalName}.${route.outputExt}`,
    storedOutputPath: outputPath,
    fileSizeAfter: outputStat.size,
  };
}

// ──────────────────────────────────────────────
// MARKDOWN → PDF (специальный случай)
// ──────────────────────────────────────────────

/**
 * Markdown → PDF через двухшаговую конвертацию:
 * 1. Pandoc: Markdown → HTML
 * 2. LibreOffice: HTML → PDF
 *
 * Почему не напрямую через Pandoc:
 * - Pandoc для PDF требует LaTeX (texlive-full ~4GB)
 * - LibreOffice уже установлен для других конвертаций
 * - Результат визуально приемлемый для большинства случаев
 *
 * Если LaTeX установлен — можно использовать Pandoc напрямую
 * (добавить опцию options.pdfEngine = "xelatex")
 */
async function convertMarkdownToPdf(
  ctx: JobContext,
  route: ConversionRoute,
  finalOutputPath: string,
): Promise<JobResult> {
  const { job, options, storageDirs } = ctx;

  // Проверяем, есть ли LaTeX
  const hasLatex = await commandExists('xelatex');

  if (hasLatex && options.pdfEngine !== 'libreoffice') {
    // Прямая конвертация через Pandoc + XeLaTeX
    try {
      await execFileAsync('pandoc', [
        job.storedOriginalPath,
        '-f', 'markdown',
        '-o', finalOutputPath,
        '--pdf-engine=xelatex',
        '--standalone',
        '-V', 'geometry:margin=2.5cm',
        '-V', 'mainfont:DejaVu Sans',
      ], { timeout: 120000 });

      const outputStat = await stat(finalOutputPath);
      const originalName = job.originalFilename.replace(/\.[^.]+$/, '');

      return {
        outputFilename: `${originalName}.pdf`,
        storedOutputPath: finalOutputPath,
        fileSizeAfter: outputStat.size,
      };
    } catch {
      // Fallback на двухшаговую конвертацию
      console.warn('[DocHandler] XeLaTeX failed, falling back to HTML→PDF via LibreOffice');
    }
  }

  // Двухшаговая: Markdown → HTML → PDF
  const tempHtmlName = `${randomUUID()}.html`;
  const tempHtmlPath = join(storageDirs.temp, tempHtmlName);

  try {
    // Шаг 1: Markdown → HTML
    await execFileAsync('pandoc', [
      job.storedOriginalPath,
      '-f', 'markdown',
      '-t', 'html',
      '-o', tempHtmlPath,
      '--standalone',
      '--metadata', 'title=Document',
    ], { timeout: 60000 });

    // Шаг 2: HTML → PDF через LibreOffice
    const loRoute: ConversionRoute = {
      tool: 'libreoffice',
      loFormat: 'pdf',
      outputExt: 'pdf',
    };

    // Подменяем путь к файлу на HTML
    const tempCtx: JobContext = {
      ...ctx,
      job: {
        ...ctx.job,
        storedOriginalPath: tempHtmlPath,
        sourceFormat: 'html',
      },
    };

    return await convertWithLibreOffice(tempCtx, loRoute);
  } finally {
    await rm(tempHtmlPath, { force: true }).catch(() => {});
  }
}

// ──────────────────────────────────────────────
// УТИЛИТЫ
// ──────────────────────────────────────────────

/**
 * Проверяет, что системная команда доступна.
 * Бросает понятную ошибку с инструкцией по установке.
 */
async function assertCommandExists(command: string, errorMessage: string): Promise<void> {
  if (!(await commandExists(command))) {
    throw new Error(errorMessage);
  }
}

/**
 * Проверяет доступность команды в PATH.
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    // which на Linux, where на Windows
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    await execFileAsync(whichCmd, [command], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Возвращает список поддерживаемых конвертаций.
 * Используется для отображения в UI и валидации.
 */
export function getSupportedConversions(): Array<{
  source: string;
  target: string;
  tool: string;
}> {
  return Object.entries(CONVERSION_TABLE).map(([key, route]) => {
    const [source, target] = key.split(':');
    return { source, target, tool: route.tool };
  });
}

/**
 * Проверяет, поддерживается ли конвертация.
 */
export function isConversionSupported(source: string, target: string): boolean {
  const key = `${source.toLowerCase()}:${target.toLowerCase()}`;
  return key in CONVERSION_TABLE;
}
