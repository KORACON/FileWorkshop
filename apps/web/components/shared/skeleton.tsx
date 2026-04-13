import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Preset shapes */
  variant?: 'text' | 'title' | 'avatar' | 'card' | 'button';
}

const variants: Record<string, string> = {
  text: 'h-4 w-full',
  title: 'h-6 w-48',
  avatar: 'h-10 w-10 rounded-full',
  card: 'h-32 w-full',
  button: 'h-10 w-24',
};

export function Skeleton({ className, variant }: Props) {
  return (
    <div className={cn('skeleton', variant && variants[variant], className)} />
  );
}

/** Skeleton group for loading states */
export function SkeletonGroup({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
