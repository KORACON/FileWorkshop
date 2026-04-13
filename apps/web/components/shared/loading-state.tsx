'use client';

interface Props {
  message?: string;
  /** 'spinner' | 'skeleton' */
  variant?: 'spinner' | 'skeleton';
  rows?: number;
}

/**
 * Единый loading state.
 */
export function LoadingState({ message = 'Загрузка...', variant = 'spinner', rows = 3 }: Props) {
  if (variant === 'skeleton') {
    return (
      <div className="space-y-3 py-4" role="status" aria-label="Загрузка">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-label={message}>
      <div className="spinner h-8 w-8 mb-3" />
      <p className="text-small text-txt-muted">{message}</p>
    </div>
  );
}
