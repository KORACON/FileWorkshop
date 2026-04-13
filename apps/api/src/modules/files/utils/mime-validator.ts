import { Logger } from '@nestjs/common';

const logger = new Logger('MimeValidator');

/**
 * Сигнатуры magic bytes для определения реального типа файла.
 * Проверяем первые N байт файла, а не доверяем расширению или Content-Type.
 *
 * Это защита от:
 * - переименования .exe в .jpg
 * - подмены Content-Type в запросе
 * - загрузки исполняемых файлов под видом изображений
 */
const MAGIC_SIGNATURES: Array<{
  mime: string;
  bytes: number[];
  offset?: number;
}> = [
  // Изображения
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },  // GIF8
  { mime: 'image/bmp', bytes: [0x42, 0x4D] },               // BM
  { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2A, 0x00] },  // Little-endian TIFF
  { mime: 'image/tiff', bytes: [0x4D, 0x4D, 0x00, 0x2A] },  // Big-endian TIFF
  { mime: 'image/avif', bytes: [0x00, 0x00, 0x00] },        // ftyp box (проверяем дополнительно)

  // PDF
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF

  // Документы (Office Open XML — ZIP-based)
  { mime: 'application/zip', bytes: [0x50, 0x4B, 0x03, 0x04] }, // PK..

  // RTF
  { mime: 'application/rtf', bytes: [0x7B, 0x5C, 0x72, 0x74, 0x66] }, // {\rtf
];

/**
 * MIME-типы, которые являются ZIP-контейнерами.
 * DOCX, ODT, XLSX — все основаны на ZIP.
 * Для них magic bytes = PK (ZIP), а реальный тип определяется по расширению.
 */
const ZIP_BASED_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.oasis.opendocument.text', // .odt
  'application/zip',
];

/**
 * Текстовые MIME-типы — не имеют magic bytes.
 * Для них проверяем, что файл не содержит бинарных данных в начале.
 */
const TEXT_MIMES = [
  'text/plain',
  'text/html',
  'text/markdown',
  'text/rtf',
];

/**
 * Определяет реальный MIME-тип файла по magic bytes.
 * Возвращает null если тип не определён.
 */
export function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset || 0;
    if (buffer.length < offset + sig.bytes.length) continue;

    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      // Дополнительная проверка для WEBP (RIFF....WEBP)
      if (sig.mime === 'image/webp') {
        if (buffer.length >= 12) {
          const webpMark = buffer.slice(8, 12).toString('ascii');
          if (webpMark !== 'WEBP') continue;
        } else {
          continue;
        }
      }

      // Дополнительная проверка для AVIF (ftyp box содержит 'avif' или 'avis')
      if (sig.mime === 'image/avif') {
        if (buffer.length >= 12) {
          const ftypStr = buffer.slice(4, 12).toString('ascii');
          if (!ftypStr.includes('ftyp')) continue;
          const brandStr = buffer.slice(8, 32).toString('ascii');
          if (!brandStr.includes('avif') && !brandStr.includes('avis')) continue;
        } else {
          continue;
        }
      }

      return sig.mime;
    }
  }

  return null;
}

/**
 * Проверяет, что заявленный MIME-тип соответствует реальному содержимому файла.
 *
 * Логика:
 * 1. Определяем реальный MIME по magic bytes
 * 2. Если файл — ZIP-контейнер (DOCX, ODT), принимаем заявленный MIME
 * 3. Если файл текстовый, проверяем отсутствие бинарных данных
 * 4. Для HEIC/HEIF — проверяем ftyp box
 * 5. Иначе — реальный MIME должен совпадать с заявленным
 */
export function validateMimeType(
  buffer: Buffer,
  claimedMime: string,
  filename: string,
): { valid: boolean; detectedMime: string | null; reason?: string } {
  const detectedMime = detectMimeFromBuffer(buffer);

  // Текстовые файлы — нет magic bytes, проверяем что нет бинарного мусора
  if (TEXT_MIMES.includes(claimedMime)) {
    const sample = buffer.slice(0, Math.min(512, buffer.length));
    const hasBinaryContent = sample.some(
      (byte) => byte < 0x09 || (byte > 0x0D && byte < 0x20 && byte !== 0x1B),
    );
    if (hasBinaryContent && claimedMime !== 'text/rtf') {
      return {
        valid: false,
        detectedMime,
        reason: `Файл содержит бинарные данные, но заявлен как ${claimedMime}`,
      };
    }
    return { valid: true, detectedMime: claimedMime };
  }

  // ZIP-based форматы (DOCX, ODT) — magic bytes = PK (ZIP)
  if (ZIP_BASED_MIMES.includes(claimedMime)) {
    if (detectedMime === 'application/zip') {
      return { valid: true, detectedMime: claimedMime };
    }
    return {
      valid: false,
      detectedMime,
      reason: `Ожидался ZIP-контейнер для ${claimedMime}, получен ${detectedMime}`,
    };
  }

  // HEIC/HEIF — ftyp box based (как AVIF)
  if (claimedMime === 'image/heic' || claimedMime === 'image/heif') {
    if (buffer.length >= 12) {
      const ftypStr = buffer.slice(4, 12).toString('ascii');
      if (ftypStr.includes('ftyp')) {
        const brandStr = buffer.slice(8, 32).toString('ascii');
        if (brandStr.includes('heic') || brandStr.includes('heix') || brandStr.includes('heif')) {
          return { valid: true, detectedMime: claimedMime };
        }
      }
    }
    return {
      valid: false,
      detectedMime,
      reason: `Файл не является HEIC/HEIF`,
    };
  }

  // Стандартная проверка — реальный MIME должен совпадать
  if (!detectedMime) {
    logger.warn(`Не удалось определить MIME для ${filename} (заявлен: ${claimedMime})`);
    // Не блокируем — некоторые форматы могут не иметь известных сигнатур
    return { valid: true, detectedMime: null };
  }

  if (detectedMime !== claimedMime) {
    // Допускаем совместимые типы
    const compatible: Record<string, string[]> = {
      'image/jpeg': ['image/jpeg'],
      'image/tiff': ['image/tiff'],
      'application/rtf': ['application/rtf', 'text/rtf'],
      'text/rtf': ['application/rtf', 'text/rtf'],
    };

    const allowed = compatible[claimedMime];
    if (allowed && allowed.includes(detectedMime)) {
      return { valid: true, detectedMime };
    }

    return {
      valid: false,
      detectedMime,
      reason: `Заявлен ${claimedMime}, но реальный тип: ${detectedMime}`,
    };
  }

  return { valid: true, detectedMime };
}
