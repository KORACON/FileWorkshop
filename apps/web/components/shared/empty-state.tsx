'use client';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | { label: string; href: string };
}

/**
 * Единый empty state для всех страниц.
 * Используется когда: нет записей в истории, нет операций, нет данных.
 */
export function EmptyState({ icon = '📭', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="status">
      <div className="w-14 h-14 bg-bg-soft rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-h3 text-txt-strong mb-1">{title}</h3>
      {description && <p className="text-small text-txt-muted max-w-sm">{description}</p>}
      {action && (
        <div className="mt-4">
          {'href' in action ? (
            <a href={action.href} className="btn-primary text-small py-2 px-4">{action.label}</a>
          ) : (
            <button onClick={action.onClick} className="btn-primary text-small py-2 px-4">{action.label}</button>
          )}
        </div>
      )}
    </div>
  );
}
