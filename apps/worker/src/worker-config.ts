import { join } from 'path';

export interface WorkerConfig {
  /** Интервал polling в мс (когда очередь пуста) */
  pollIntervalMs: number;

  /** Интервал polling в мс (когда есть задачи — быстрее) */
  pollIntervalBusyMs: number;

  /** Таймаут обработки одной задачи в мс */
  jobTimeoutMs: number;

  /** Максимальное количество параллельных задач */
  concurrency: number;

  /** Таймаут для stale job recovery в минутах */
  staleTimeoutMinutes: number;

  /** Базовая директория storage */
  storageBaseDir: string;

  /** Директории storage */
  storageDirs: {
    temp: string;
    original: string;
    processed: string;
    failed: string;
    quarantine: string;
  };
}

export function loadConfig(): WorkerConfig {
  const baseDir = process.env.STORAGE_BASE_DIR || join(process.cwd(), '..', '..', 'storage');

  return {
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || '3000', 10),
    pollIntervalBusyMs: parseInt(process.env.WORKER_POLL_INTERVAL_BUSY_MS || '500', 10),
    jobTimeoutMs: parseInt(process.env.WORKER_JOB_TIMEOUT_MS || '120000', 10), // 2 минуты
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
    staleTimeoutMinutes: parseInt(process.env.WORKER_STALE_TIMEOUT_MIN || '10', 10),
    storageBaseDir: baseDir,
    storageDirs: {
      temp: join(baseDir, 'temp'),
      original: join(baseDir, 'original'),
      processed: join(baseDir, 'processed'),
      failed: join(baseDir, 'failed'),
      quarantine: join(baseDir, 'quarantine'),
    },
  };
}
