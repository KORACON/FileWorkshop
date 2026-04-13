'use client';

import { getAllSupportedExtensions } from '@/lib/capability-registry';

interface Props {
  filename: string;
  onReset: () => void;
}

/**
 * Показывается когда загружен файл неподдерживаемого формата.
 */
export function UnsupportedFormat({ filename, onReset }: Props) {
  const ext = filename.split('.').pop()?.toUpperCase() || 'файл';
  const supported = getAllSupportedExtensions().slice(0, 12).map((e) => e.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="alert">
      <div className="w-14 h-14 bg-warning-light rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl">📎</span>
      </div>
      <h3 className="text-h3 text-txt-strong mb-1">Формат .{ext} не поддерживается</h3>
      <p className="text-small text-txt-muted max-w-sm mb-4">
        Для этого типа файла пока нет доступных операций.
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 mb-5 max-w-md">
        {supported.map((f) => (
          <span key={f} className="badge badge-neutral">{f}</span>
        ))}
      </div>
      <button onClick={onReset} className="btn-secondary text-small py-2 px-4">
        Загрузить другой файл
      </button>
    </div>
  );
}
