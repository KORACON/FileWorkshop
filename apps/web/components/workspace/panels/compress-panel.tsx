'use client';

import { formatFileSize } from '@/lib/utils';

interface Props {
  fileSize: number;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * Compress Panel — показывает slider качества + прогноз размера.
 */
export function CompressPanel({ fileSize, values, onChange }: Props) {
  const quality = parseInt(values.quality || '75', 10);

  // Прогноз размера: грубая оценка на основе quality
  // При quality=100 → ~100% размера, quality=50 → ~40%, quality=10 → ~15%
  const ratio = 0.15 + (quality / 100) * 0.85;
  const estimatedSize = Math.round(fileSize * ratio);
  const savedPercent = Math.round((1 - ratio) * 100);

  return (
    <div className="panel-body space-y-5">
      {/* Quality slider */}
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
        <div className="flex justify-between text-micro text-txt-faint mt-1">
          <span>Минимум</span>
          <span>Максимум</span>
        </div>
      </div>

      {/* Size estimate */}
      <div className="bg-bg-soft rounded-card p-3 space-y-2">
        <div className="flex justify-between text-caption">
          <span className="text-txt-muted">Текущий размер</span>
          <span className="text-txt-base font-mono">{formatFileSize(fileSize)}</span>
        </div>
        <div className="flex justify-between text-caption">
          <span className="text-txt-muted">Ожидаемый размер</span>
          <span className="text-txt-strong font-mono font-semibold">~{formatFileSize(estimatedSize)}</span>
        </div>
        {savedPercent > 5 && (
          <div className="flex justify-between text-caption">
            <span className="text-txt-muted">Экономия</span>
            <span className="text-success font-mono font-semibold">~{savedPercent}%</span>
          </div>
        )}
      </div>

      {/* Quality hints */}
      <div className="space-y-1.5">
        {quality < 30 && (
          <div className="p-2.5 bg-warning-light rounded-badge text-caption text-warning-text">
            ⚠ Низкое качество. Возможны заметные артефакты сжатия.
          </div>
        )}
        {quality >= 90 && (
          <div className="p-2.5 bg-info-light rounded-badge text-caption text-info-text">
            ℹ Высокое качество. Размер файла уменьшится незначительно.
          </div>
        )}
      </div>
    </div>
  );
}
