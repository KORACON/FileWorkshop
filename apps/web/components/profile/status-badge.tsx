import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/job';

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  QUEUED:     { label: 'В очереди',  className: 'badge-neutral' },
  PROCESSING: { label: 'Обработка', className: 'badge-processing' },
  DONE:       { label: 'Готово',    className: 'badge-success' },
  ERROR:      { label: 'Ошибка',   className: 'badge-error' },
  CANCELED:   { label: 'Отменено', className: 'badge-warning' },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const config = statusConfig[status] || statusConfig.ERROR;
  return <span className={cn('badge', config.className)}>{config.label}</span>;
}
