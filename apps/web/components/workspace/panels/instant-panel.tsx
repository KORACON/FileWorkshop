'use client';

export function InstantPanel({ description }: { description: string }) {
  return (
    <div className="panel-body space-y-4">
      <div className="p-3 bg-info-light rounded-card">
        <p className="text-caption text-info-text">{description}</p>
      </div>
      <p className="text-micro text-txt-faint text-center">
        Нажмите «Обработать» для применения
      </p>
    </div>
  );
}
