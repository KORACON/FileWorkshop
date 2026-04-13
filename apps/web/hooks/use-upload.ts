'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { UploadResponse } from '@/types/job';

interface UseUploadOptions {
  onSuccess?: (result: UploadResponse) => void;
  onError?: (error: string) => void;
}

interface UseUploadResult {
  upload: (file: File, operationType: string, targetFormat?: string, options?: Record<string, string>) => Promise<UploadResponse | null>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useUpload(opts: UseUploadOptions = {}): UseUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (
    file: File,
    operationType: string,
    targetFormat?: string,
    options?: Record<string, string>,
  ): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('operationType', operationType);
      if (targetFormat) formData.append('targetFormat', targetFormat);
      if (options) formData.append('options', JSON.stringify(options));

      setProgress(50); // Индикация отправки

      const res = await api.upload<UploadResponse>('/api/files/upload', formData);

      setProgress(100);
      opts.onSuccess?.(res.data);
      return res.data;
    } catch (err: any) {
      const message = err.message || 'Ошибка загрузки файла';
      setError(message);
      opts.onError?.(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [opts]);

  return { upload, isUploading, progress, error, reset };
}
