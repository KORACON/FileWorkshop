'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { Tool } from '@/types/tool';
import type { FileJob } from '@/types/job';
import { useUpload } from '@/hooks/use-upload';
import { useJobPolling } from '@/hooks/use-job-polling';
import { useAuthStore } from '@/stores/auth-store';
import { FileDropzone } from './file-dropzone';
import { FilePreview } from './file-preview';
import { OperationForm } from './operation-form';
import { JobStatusDisplay } from './job-status';

type PageState = 'idle' | 'uploaded' | 'processing' | 'done' | 'error';

interface Props {
  tool: Tool;
}

/**
 * Основной контент страницы инструмента.
 * Управляет полным flow: upload → options → process → result.
 */
export function ToolPageContent({ tool }: Props) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Состояние страницы
  const [pageState, setPageState] = useState<PageState>('idle');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(tool.options.map((o) => [o.key, o.default])),
  );

  // Upload
  const { upload, isUploading, error: uploadError, reset: resetUpload } = useUpload();

  // Job polling
  const { job, isPolling, error: pollingError, startPolling } = useJobPolling({
    onComplete: (completedJob) => {
      setPageState(completedJob.status === 'DONE' ? 'done' : 'error');
      // Инвалидируем историю чтобы новая запись появилась
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    },
  });

  // Выбор файла
  const handleFileSelect = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setPageState('uploaded');
  }, []);

  // Удаление файла
  const handleRemoveFile = useCallback(() => {
    setSelectedFiles([]);
    setPageState('idle');
    resetUpload();
  }, [resetUpload]);

  // Запуск обработки
  const handleProcess = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    // Фильтруем пустые options
    const cleanOptions: Record<string, string> = {};
    for (const [key, value] of Object.entries(options)) {
      if (value !== '' && value !== undefined) {
        cleanOptions[key] = value;
      }
    }

    const result = await upload(
      selectedFiles[0],
      tool.operationType,
      tool.targetFormat,
      Object.keys(cleanOptions).length > 0 ? cleanOptions : undefined,
    );

    if (result) {
      setPageState('processing');
      startPolling(result.jobId);
    }
  }, [selectedFiles, options, upload, tool, startPolling]);

  // Скачивание результата
  const handleDownload = useCallback(async () => {
    if (!job?.id) return;
    try {
      const { getAccessToken } = await import('@/lib/api-client');
      const token = getAccessToken();
      const res = await fetch(`/api/files/${job.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/);
      const filename = m ? decodeURIComponent(m[1].replace(/"/g, '')) : 'result';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, [job]);

  // Сброс — новый файл
  const handleNewFile = useCallback(() => {
    setSelectedFiles([]);
    setPageState('idle');
    resetUpload();
    setOptions(Object.fromEntries(tool.options.map((o) => [o.key, o.default])));
  }, [resetUpload, tool]);

  // Требуется авторизация
  if (!isAuthenticated) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-500 mb-4">Для обработки файлов необходимо войти в аккаунт</p>
        <div className="flex gap-3 justify-center">
          <Link href="/auth/login" className="btn-primary">Войти</Link>
          <Link href="/auth/register" className="btn-secondary">Регистрация</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Шаг 1: Загрузка файла */}
      {pageState === 'idle' && (
        <FileDropzone
          tool={tool}
          onFileSelect={handleFileSelect}
        />
      )}

      {/* Шаг 2: Превью + параметры + кнопка */}
      {pageState === 'uploaded' && (
        <>
          {selectedFiles.map((file, i) => (
            <FilePreview key={i} file={file} onRemove={handleRemoveFile} />
          ))}

          <OperationForm
            options={tool.options}
            values={options}
            onChange={setOptions}
          />

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {uploadError}
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={isUploading}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Загрузка...
              </>
            ) : (
              <>🚀 Обработать</>
            )}
          </button>
        </>
      )}

      {/* Шаг 3: Статус обработки */}
      {(pageState === 'processing' || pageState === 'done' || pageState === 'error') && (
        <>
          {selectedFiles[0] && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>📎</span>
              <span className="truncate">{selectedFiles[0].name}</span>
            </div>
          )}

          <JobStatusDisplay
            job={job}
            isPolling={isPolling}
            pollingError={pollingError}
            onDownload={handleDownload}
            onNewFile={handleNewFile}
          />
        </>
      )}
    </div>
  );
}
