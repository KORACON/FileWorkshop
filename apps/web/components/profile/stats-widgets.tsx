'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatFileSize } from '@/lib/utils';
import type { ProfileStats } from '@/types/user';

export function StatsWidgets() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const res = await api.get<ProfileStats>('/api/profile/stats');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 w-16 skeleton rounded mb-2" />
            <div className="h-8 w-12 skeleton rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const savedBytes = stats.totalSizeBefore - stats.totalSizeAfter;
  const savedPercent = stats.totalSizeBefore > 0 && savedBytes > 0
    ? Math.round((savedBytes / stats.totalSizeBefore) * 100)
    : 0;

  const widgets = [
    { label: 'Всего операций', value: stats.totalJobs, icon: '📊' },
    { label: 'Изображений', value: stats.imageJobs, icon: '🖼' },
    { label: 'PDF', value: stats.pdfJobs, icon: '📄' },
    { label: 'Обработано', value: stats.completedJobs, icon: '✅',
      sub: savedPercent > 0 ? `Сэкономлено ${savedPercent}% (${formatFileSize(savedBytes)})` : undefined },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {widgets.map((w) => (
        <div key={w.label} className="card">
          <div className="flex items-center gap-2 text-sm text-txt-muted mb-1">
            <span>{w.icon}</span>
            {w.label}
          </div>
          <div className="text-2xl font-bold text-txt-strong">{w.value}</div>
          {w.sub && <div className="text-xs text-txt-faint mt-1">{w.sub}</div>}
        </div>
      ))}
    </div>
  );
}

