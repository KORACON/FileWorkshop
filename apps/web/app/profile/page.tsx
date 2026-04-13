'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ProfileCard } from '@/components/profile/profile-card';
import { StatsWidgets } from '@/components/profile/stats-widgets';
import { api } from '@/lib/api-client';
import { formatDate, formatFileSize, formatSizeDiff, sizeDiffColor } from '@/lib/utils';
import type { HistoryResponse } from '@/types/history';
import { StatusBadge } from '@/components/profile/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';

const OP_LABELS: Record<string, string> = {
  'image.convert': 'Конвертация', 'image.resize': 'Resize', 'image.compress': 'Сжатие',
  'image.rotate': 'Поворот', 'image.remove_exif': 'Удаление EXIF', 'image.crop': 'Обрезка',
  'image.remove_bg': 'Удаление фона', 'pdf.compress': 'Сжатие PDF', 'pdf.split': 'Разделение PDF',
  'pdf.rotate': 'Поворот PDF', 'pdf.extract_pages': 'Извлечение страниц',
  'pdf.to_images': 'PDF → изображения', 'pdf.from_images': 'Изображения → PDF',
  'pdf.remove_metadata': 'Удаление метаданных', 'doc.convert': 'Конвертация',
};
function formatOp(type: string) { return OP_LABELS[type] || type; }

export default function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-history'],
    queryFn: async () => {
      const res = await api.get<HistoryResponse>('/api/history?limit=5');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  return (
    <div className="space-y-6">
      <ProfileCard />
      <StatsWidgets />

      {/* Последние операции */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Последние операции</h3>
          <Link href="/profile/history" className="text-sm text-primary-600 hover:text-primary-500">
            Вся история →
          </Link>
        </div>

        {isLoading ? (
          <LoadingState variant="skeleton" rows={3} />
        ) : !data?.items.length ? (
          <EmptyState
            icon="📋"
            title="Пока нет операций"
            description="Загрузите файл на главной странице и выполните первую операцию"
            action={{ label: 'Начать работу', href: '/' }}
          />
        ) : (
          <div className="space-y-2">
            {data.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <StatusBadge status={item.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {item.originalFilename}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatOp(item.operationType)}
                    {item.targetFormat && ` → ${item.targetFormat.toUpperCase()}`}
                    {' · '}{formatDate(item.createdAt)}
                  </p>
                </div>
                {item.fileSizeAfter && (
                  <div className="text-xs text-slate-500 text-right flex-shrink-0">
                    <span>{formatFileSize(item.fileSizeBefore)}</span>
                    <span className="mx-1">→</span>
                    <span>{formatFileSize(item.fileSizeAfter)}</span>
                    <span className={`ml-1 ${sizeDiffColor(item.fileSizeBefore, item.fileSizeAfter)}`}>
                      ({formatSizeDiff(item.fileSizeBefore, item.fileSizeAfter)})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
