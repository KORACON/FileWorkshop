'use client';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/**
 * Единый error state.
 * Используется при: ошибке загрузки данных, ошибке API, неподдерживаемом формате.
 */
export function ErrorState({ title = 'Произошла ошибка', message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center" role="alert">
      <div className="w-14 h-14 bg-error-light rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-h3 text-txt-strong mb-1">{title}</h3>
      <p className="text-small text-txt-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-small py-2 px-4">
          Попробовать снова
        </button>
      )}
    </div>
  );
}
