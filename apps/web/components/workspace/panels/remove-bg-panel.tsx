'use client';

import { cn } from '@/lib/utils';
import type { RemoveBgState, RemoveBgActions } from '@/hooks/use-remove-bg';

interface Props {
  state: RemoveBgState;
  actions: RemoveBgActions;
  threshold: string;
  onThresholdChange: (value: string) => void;
  showOriginal: boolean;
  onToggleOriginal: () => void;
}

export function RemoveBgPanel({ state, actions, threshold, onThresholdChange, showOriginal, onToggleOriginal }: Props) {
  const thresholdNum = parseInt(threshold || '50', 10);

  return (
    <div className="panel-body space-y-5">
      {/* Before/After toggle */}
      <div className="flex gap-1 p-1 bg-bg-soft rounded-button">
        <button
          onClick={() => showOriginal && onToggleOriginal()}
          className={cn(
            'flex-1 py-2 rounded-badge text-caption font-medium transition-all',
            !showOriginal ? 'bg-surface shadow-button text-txt-strong' : 'text-txt-muted hover:text-txt-base',
          )}
        >
          ✨ Результат
        </button>
        <button
          onClick={() => !showOriginal && onToggleOriginal()}
          className={cn(
            'flex-1 py-2 rounded-badge text-caption font-medium transition-all',
            showOriginal ? 'bg-surface shadow-button text-txt-strong' : 'text-txt-muted hover:text-txt-base',
          )}
        >
          👁 Оригинал
        </button>
      </div>

      {/* Threshold */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-caption font-medium text-txt-muted">Чувствительность</label>
          <span className="text-caption font-mono text-txt-strong">{thresholdNum}</span>
        </div>
        <input
          type="range" min={1} max={100} value={thresholdNum}
          onChange={(e) => onThresholdChange(e.target.value)}
          className="w-full accent-primary h-2"
        />
        <p className="text-micro text-txt-faint mt-1">
          Больше → удаляет больше фона. Меньше → точнее сохраняет объект.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Brush tools */}
      <div>
        <label className="text-caption font-medium text-txt-muted mb-2 block">Ручная дочистка</label>

        <div className="flex gap-1 p-1 bg-bg-soft rounded-button mb-3">
          <button
            onClick={() => actions.setBrushMode('erase')}
            className={cn(
              'flex-1 py-1.5 rounded-badge text-caption font-medium transition-all',
              state.brushMode === 'erase' ? 'bg-error-light text-error-text shadow-button' : 'text-txt-muted hover:text-txt-base',
            )}
          >
            🧹 Стереть
          </button>
          <button
            onClick={() => actions.setBrushMode('restore')}
            className={cn(
              'flex-1 py-1.5 rounded-badge text-caption font-medium transition-all',
              state.brushMode === 'restore' ? 'bg-success-light text-success-text shadow-button' : 'text-txt-muted hover:text-txt-base',
            )}
          >
            🖌 Вернуть
          </button>
        </div>

        {/* Brush size */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-micro text-txt-faint">Размер кисти</span>
            <span className="text-micro font-mono text-txt-muted">{state.brushSize}px</span>
          </div>
          <input
            type="range" min={5} max={100} value={state.brushSize}
            onChange={(e) => actions.setBrushSize(parseInt(e.target.value, 10))}
            className="w-full accent-primary h-1.5"
          />
        </div>
      </div>

      {/* Reset */}
      {state.hasManualEdits && (
        <button onClick={actions.resetMask}
          className="w-full py-2 rounded-button text-caption font-medium border border-warning bg-warning-light text-warning-text hover:opacity-90 transition-colors">
          ↩ Сбросить ручные правки
        </button>
      )}

      {/* Info */}
      <div className="p-3 bg-bg-soft rounded-card text-micro text-txt-faint space-y-1">
        <p><span className="text-error">●</span> Стереть — удаляет оставшийся фон</p>
        <p><span className="text-success">●</span> Вернуть — восстанавливает удалённое</p>
        <p className="pt-1">Рисуйте прямо на изображении. Результат — PNG с прозрачностью.</p>
      </div>
    </div>
  );
}
