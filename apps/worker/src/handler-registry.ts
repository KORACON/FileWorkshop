import { FileJob } from '@prisma/client';
import { WorkerConfig } from './worker-config';

// ──────────────────────────────────────────────
// Типы
// ──────────────────────────────────────────────

export interface JobContext {
  job: FileJob & {
    options: Array<{ optionKey: string; optionValue: string }>;
  };
  /** Опции в виде key-value объекта */
  options: Record<string, string>;
  /** Пути к директориям storage */
  storageDirs: WorkerConfig['storageDirs'];
}

export interface JobResult {
  /** Имя файла для скачивания пользователем */
  outputFilename: string;
  /** Полный путь к результату на диске */
  storedOutputPath: string;
  /** Размер результата в байтах */
  fileSizeAfter: number;
}

export type JobHandler = (context: JobContext) => Promise<JobResult>;

// ──────────────────────────────────────────────
// Реестр handler-ов
// ──────────────────────────────────────────────

/**
 * Маршрутизация operationType → handler.
 *
 * operationType формат: "категория.действие"
 * Примеры: image.convert, pdf.merge, doc.convert
 *
 * Для добавления нового инструмента:
 * 1. Создать handler в handlers/
 * 2. Зарегистрировать в registerHandlers()
 */
export class HandlerRegistry {
  private handlers = new Map<string, JobHandler>();

  constructor(private readonly config: WorkerConfig) {
    this.registerHandlers();
  }

  getHandler(operationType: string): JobHandler | undefined {
    return this.handlers.get(operationType);
  }

  register(operationType: string, handler: JobHandler) {
    this.handlers.set(operationType, handler);
  }

  listRegistered(): string[] {
    return Array.from(this.handlers.keys());
  }

  private registerHandlers() {
    // Импортируем handler-ы лениво чтобы не тянуть зависимости при старте
    // Каждый handler — отдельный файл в handlers/

    // ── Изображения ──
    const { handleImageConvert } = require('./handlers/image.handler');
    this.register('image.convert', handleImageConvert);
    this.register('image.resize', handleImageConvert);
    this.register('image.compress', handleImageConvert);
    this.register('image.rotate', handleImageConvert);
    this.register('image.remove_exif', handleImageConvert);
    this.register('image.crop', handleImageConvert);
    this.register('image.remove_bg', handleImageConvert);

    // ── PDF ──
    const { handlePdfOperation } = require('./handlers/pdf.handler');
    this.register('pdf.merge', handlePdfOperation);
    this.register('pdf.split', handlePdfOperation);
    this.register('pdf.compress', handlePdfOperation);
    this.register('pdf.rotate', handlePdfOperation);
    this.register('pdf.extract_pages', handlePdfOperation);
    this.register('pdf.to_images', handlePdfOperation);
    this.register('pdf.from_images', handlePdfOperation);
    this.register('pdf.remove_metadata', handlePdfOperation);
    this.register('pdf.reorder', handlePdfOperation);
    this.register('pdf.add_page_numbers', handlePdfOperation);
    this.register('pdf.delete_pages', handlePdfOperation);
    this.register('pdf.watermark', handlePdfOperation);
    this.register('pdf.crop', handlePdfOperation);
    this.register('pdf.protect', handlePdfOperation);
    this.register('pdf.unlock', handlePdfOperation);
    this.register('pdf.sign', handlePdfOperation);
    this.register('pdf.redact', handlePdfOperation);
    this.register('pdf.compare', handlePdfOperation);
    this.register('pdf.annotate', handlePdfOperation);
    this.register('pdf.repair', handlePdfOperation);
    this.register('pdf.ocr', handlePdfOperation);
    this.register('pdf.extract_images', handlePdfOperation);
    this.register('pdf.scan', handlePdfOperation);
    this.register('pdf.to_text', handlePdfOperation);
    this.register('pdf.to_docx', handlePdfOperation);
    this.register('pdf.to_pptx', handlePdfOperation);
    this.register('pdf.to_xlsx', handlePdfOperation);
    this.register('pdf.to_html', handlePdfOperation);

    // ── Документы ──
    const { handleDocConvert } = require('./handlers/document.handler');
    this.register('doc.convert', handleDocConvert);

    console.log(`Зарегистрировано ${this.handlers.size} handler-ов: ${this.listRegistered().join(', ')}`);
  }
}
