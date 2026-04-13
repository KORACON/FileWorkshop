export class UploadResponseDto {
  jobId: string;
  status: string;
  originalFilename: string;
  fileSize: number;
  operationType: string;
}

export class BatchUploadResponseDto {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    jobId: string;
    status: string;
    originalFilename: string;
    fileSize: number;
    error?: string;
  }>;
}
