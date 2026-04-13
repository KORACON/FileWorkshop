'use client';

import { formatFileSize } from '@/lib/utils';

interface Props {
  fileSize: number;
  maxSize: number;
  onReset: () => void;
}

/**
 * Показывается когда файл превышает лимит размера.
 */
export function FileTooLarge({ fileSize, maxSize, onReset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="alert">
      <div className="w-14 h-14 bg-error-light rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl">📦</span>
      </div>
      <h3 className="text-h3 text-txt-strong mb-1">Файл слишком большой</h3>
      <p className="text-small text-txt-muted max-w-sm mb-2">
        Размер файла: <span className="font-mono font-medium text-txt-base">{formatFileSize(fileSize)}</span>
      </p>
      <p className="text-small text-txt-muted max-w-sm mb-5">
        Максимум на текущем тарифе: <span className="font-mono font-medium text-txt-base">{formatFileSize(maxSize)}</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onReset} className="btn-secondary text-small py-2 px-4">
          Загрузить другой файл
        </button>
        <a href="/pricing" className="btn-primary text-small py-2 px-4">
          Увеличить лимит
        </a>
      </div>
    </div>
  );
}
