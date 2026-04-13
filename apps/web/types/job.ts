export type JobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'ERROR' | 'CANCELED';

export interface FileJob {
  id: string;
  status: JobStatus;
  operationType: string;
  originalFilename: string;
  sourceFormat: string;
  targetFormat: string | null;
  fileSizeBefore: number;
  fileSizeAfter: number | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface UploadResponse {
  jobId: string;
  status: JobStatus;
  originalFilename: string;
  fileSize: number;
  operationType: string;
}

export interface BatchUploadResponse {
  total: number;
  successful: number;
  failed: number;
  results: Array<UploadResponse & { error?: string }>;
}
