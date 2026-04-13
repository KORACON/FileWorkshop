export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ProfileStats {
  totalJobs: number;
  completedJobs: number;
  imageJobs: number;
  pdfJobs: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
}

export interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}
