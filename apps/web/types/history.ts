import { JobStatus } from './job';

export interface HistoryEntry {
  id: string;
  originalFilename: string;
  operationType: string;
  sourceFormat: string;
  targetFormat: string | null;
  status: JobStatus;
  fileSizeBefore: number;
  fileSizeAfter: number | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface HistoryFilters {
  status?: JobStatus;
  operationType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface HistoryResponse {
  items: HistoryEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RepeatData {
  operationType: string;
  sourceFormat: string;
  targetFormat: string | null;
  options: Record<string, string>;
}
