'use client';

interface Props {
  sourceFormat: string;
  targetFormat: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  hasQuality: boolean;
}

/**
 * Convert Panel — показывает целевой формат, quality (если есть) и предупреждения.
 */
export function ConvertPanel({ sourceFormat, targetFormat, values, onChange, hasQuality }: Props) {
  const quality = parseInt(values.quality || '85', 10);
  const src = sourceFormat.toUpperCase();
  const tgt = targetFormat.toUpperCase();

  // Определяем предупреждения
  const warnings: string[] = [];

  // Потеря прозрачности: PNG/WEBP → JPG
  if (['png', 'webp'].includes(sourceFormat) && targetFormat === 'jpg') {
    warnings.push('JPG не поддерживает прозрачность. Прозрачные области станут белыми.');
  }

  // Потеря качества: PNG (lossless) → JPG/WEBP (lossy)
  if (sourceFormat === 'png' && ['jpg', 'webp', 'avif'].includes(targetFormat)) {
    warnings.push(`${tgt} использует сжатие с потерями. Качество может незначительно снизиться.`);
  }

  // HEIC → может быть медленнее
  if (['heic', 'heif'].includes(sourceFormat)) {
    warnings.push('Конвертация HEIC может занять больше времени.');
  }

  // SVG → растеризация
  if (sourceFormat === 'svg') {
    warnings.push('SVG будет растеризован. Векторные свойства будут потеряны.');
  }

  // GIF → потеря анимации
  if (sourceFormat === 'gif') {
    warnings.push('Будет конвертирован только первый кадр. Анимация будет потеряна.');
  }

  return (
    <div className="panel-body space-y-5">
      {/* Conversion direction */}
      <div className="bg-bg-soft rounded-card p-3">
        <div className="flex items-center justify-center gap-3">
          <span className="badge badge-neutral font-mono">{src}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 8h10M10 5l3 3-3 3" />
          </svg>
          <span className="badge badge-info font-mono">{tgt}</span>
        </div>
      </div>

      {/* Quality slider (for lossy formats) */}
      {hasQuality && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-caption font-medium text-txt-muted">Качество</label>
            <span className="text-caption font-mono text-txt-strong">{quality}%</span>
          </div>
          <input
            type="range" min={1} max={100} value={quality}
            onChange={(e) => onChange('quality', e.target.value)}
            className="w-full accent-primary h-2"
          />
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="p-2.5 bg-warning-light rounded-badge text-caption text-warning-text">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* No warnings = positive message */}
      {warnings.length === 0 && (
        <div className="p-2.5 bg-success-light rounded-badge text-caption text-success-text">
          ✓ Конвертация без потери качества
        </div>
      )}
    </div>
  );
}
