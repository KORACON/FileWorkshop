export class ProfileResponseDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export class ProfileStatsDto {
  totalJobs: number;
  completedJobs: number;
  imageJobs: number;
  pdfJobs: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
}
