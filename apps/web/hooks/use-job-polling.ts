'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { FileJob, JobStatus } from '@/types/job';

interface UseJobPollingOptions {
  /** Интервал polling в мс (по умолчанию 2000) */
  interval?: number;
  /** Максимальное количество ошибок подряд перед остановкой */
  maxErrors?: number;
  /** Callback при завершении (DONE или ERROR) */
  onComplete?: (job: FileJob) => void;
}

interface UseJobPollingResult {
  job: FileJob | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

export function useJobPolling(options: UseJobPollingOptions = {}): UseJobPollingResult {
  const { interval = 2000, maxErrors = 5, onComplete } = options;

  const [job, setJob] = useState<FileJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPolling(false);
    jobIdRef.current = null;
  }, []);

  const poll = useCallback(async () => {
    if (!jobIdRef.current) return;

    try {
      const res = await api.get<FileJob>(`/api/jobs/${jobIdRef.current}/status`);
      setJob(res.data);
      errorCountRef.current = 0;

      const finalStatuses: JobStatus[] = ['DONE', 'ERROR', 'CANCELED'];
      if (finalStatuses.includes(res.data.status)) {
        stopPolling();
        onComplete?.(res.data);
      }
    } catch (err: any) {
      errorCountRef.current++;
      if (errorCountRef.current >= maxErrors) {
        setError('Не удалось получить статус задачи. Проверьте позже в истории.');
        stopPolling();
      }
    }
  }, [maxErrors, onComplete, stopPolling]);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    jobIdRef.current = jobId;
    errorCountRef.current = 0;
    setError(null);
    setIsPolling(true);

    // Первый запрос сразу
    poll();

    // Далее по интервалу
    timerRef.current = setInterval(poll, interval);
  }, [interval, poll, stopPolling]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { job, isPolling, error, startPolling, stopPolling };
}
