'use client';

import { formatFileSize, formatSizeDiff } from '@/lib/utils';
import type { FileJob } from '@/types/job';

interface Props {
  job: FileJob | null;
  isPolling: boolean;
  pollingError: string | null;
  onDownload: () => void;
  onNewFile: () => void;
}

export function JobStatusDisplay({ job, isPolling, pollingError, onDownload, onNewFile }: Props) {
  // Polling error
  if (pollingError) {
    return (
      <div className="card border-amber-200 bg-amber-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">{pollingError}</p>
            <button onClick={onNewFile} className="text-sm text-primary-600 hover:text-primary-500 mt-1">
              Загрузить другой файл
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  // QUEUED
  if (job.status === 'QUEUED') {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <div>
            <p className="text-sm font-medium text-txt-base">В очереди</p>
            <p className="text-xs text-txt-faint">Задача ожидает обработки...</p>
          </div>
        </div>
      </div>
    );
  }

  // PROCESSING
  if (job.status === 'PROCESSING') {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          <span className="animate-spin text-2xl">⚙️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-txt-base">Обработка...</p>
            <div className="mt-2 h-2 bg-bg-soft rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DONE
  if (job.status === 'DONE') {
    const hasSizeInfo = job.fileSizeBefore > 0 && job.fileSizeAfter != null;

    return (
      <div className="card border-success/20 bg-success-light">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-medium text-green-800">Готово</p>
            {hasSizeInfo && (
              <p className="text-xs text-success">
                {formatFileSize(job.fileSizeBefore)} → {formatFileSize(job.fileSizeAfter!)}
                {' '}
                <span className="font-medium">
                  ({formatSizeDiff(job.fileSizeBefore, job.fileSizeAfter!)})
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onDownload} className="btn-primary flex items-center gap-2">
            ⬇ Скачать
            {job.fileSizeAfter != null && (
              <span className="text-xs opacity-75">({formatFileSize(job.fileSizeAfter)})</span>
            )}
          </button>
          <button onClick={onNewFile} className="btn-secondary">
            🔄 Ещё файл
          </button>
        </div>
      </div>
    );
  }

  // ERROR
  if (job.status === 'ERROR') {
    return (
      <div className="card border-error/20 bg-error-light">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">❌</span>
          <div>
            <p className="text-sm font-medium text-red-800">Ошибка обработки</p>
            {job.errorMessage && (
              <p className="text-xs text-error mt-1">{job.errorMessage}</p>
            )}
          </div>
        </div>
        <button onClick={onNewFile} className="btn-secondary text-sm">
          Попробовать снова
        </button>
      </div>
    );
  }

  // CANCELED
  return (
    <div className="card border-border">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚫</span>
        <p className="text-sm text-txt-muted">Операция отменена</p>
      </div>
      <button onClick={onNewFile} className="btn-secondary text-sm mt-3">
        Загрузить файл
      </button>
    </div>
  );
}

