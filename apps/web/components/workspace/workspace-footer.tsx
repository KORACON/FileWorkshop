'use client';

import { formatFileSize, formatSizeDiff, sizeDiffColor } from '@/lib/utils';
import type { WorkspaceState } from '@/stores/workspace-store';
import type { FileJob } from '@/types/job';

interface Props {
  state: WorkspaceState;
  job: FileJob | null;
  isUploading: boolean;
  onProcess: () => void;
  onDownload: () => void;
  onBackToActions: () => void;
  onReset: () => void;
}

export function WorkspaceFooter({ state, job, isUploading, onProcess, onDownload, onBackToActions, onReset }: Props) {
  if (state === 'file-loaded') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-t border-border">
        <p className="text-small text-txt-faint">← Выберите действие в меню</p>
      </div>
    );
  }

  if (state === 'editing') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-t border-border">
        <button onClick={onProcess} disabled={isUploading} className="btn-primary flex items-center gap-2">
          {isUploading ? (
            <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Загрузка...</>
          ) : '🚀 Обработать'}
        </button>
        <button onClick={onBackToActions} className="btn-ghost">Назад</button>
        <div className="flex-1" />
        <button onClick={onReset} className="btn-ghost text-txt-faint">Другой файл</button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex items-center justify-center px-4 py-3 bg-surface border-t border-border">
        <span className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full mr-2" />
        <span className="text-small text-txt-muted">Обработка файла...</span>
      </div>
    );
  }

  if (state === 'done' && job) {
    const hasSizeInfo = job.fileSizeBefore > 0 && job.fileSizeAfter != null;
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-success-light border-t border-success/20">
        <span className="badge badge-success">✓ Готово</span>
        {hasSizeInfo && (
          <span className="text-caption text-success-text">
            {formatFileSize(job.fileSizeBefore)} → {formatFileSize(job.fileSizeAfter!)}
            <span className={`ml-1 ${sizeDiffColor(job.fileSizeBefore, job.fileSizeAfter!)}`}>
              ({formatSizeDiff(job.fileSizeBefore, job.fileSizeAfter!)})
            </span>
          </span>
        )}
        <div className="flex-1" />
        <button onClick={onDownload} className="btn-primary py-2">⬇ Скачать</button>
        <button onClick={onBackToActions} className="btn-ghost">Другое действие</button>
        <button onClick={onReset} className="btn-ghost text-txt-faint">Новый файл</button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-error-light border-t border-error/20">
        <span className="badge badge-error">Ошибка</span>
        <span className="text-caption text-error-text flex-1 truncate">{job?.errorMessage || 'Ошибка обработки'}</span>
        <button onClick={onProcess} className="btn-primary py-2">Повторить</button>
        <button onClick={onBackToActions} className="btn-ghost">Другое действие</button>
      </div>
    );
  }

  return null;
}
