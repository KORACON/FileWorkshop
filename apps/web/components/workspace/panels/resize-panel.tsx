'use client';

import { cn } from '@/lib/utils';
import type { ResizeState, ResizeActions } from '@/hooks/use-resize-state';

interface Props {
  state: ResizeState;
  actions: ResizeActions;
}

/**
 * Resize Panel — right sidebar controls.
 * Receives state/actions from useResizeState hook (owned by workspace-shell).
 */
export function ResizePanel({ state, actions }: Props) {
  const { origW, origH, width, height, lockRatio, scalePercent } = state;

  return (
    <div className="p-4 space-y-5">
      {/* Width */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Ширина</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={width || ''}
            onChange={(e) => actions.setWidth(parseInt(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); actions.setWidth(width + (e.shiftKey ? 10 : 1)); }
              if (e.key === 'ArrowDown') { e.preventDefault(); actions.setWidth(width - (e.shiftKey ? 10 : 1)); }
            }}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min={10} max={16384}
          />
          <span className="text-xs text-slate-400">px</span>
        </div>
      </div>

      {/* Lock */}
      <div className="flex justify-center">
        <button
          onClick={actions.toggleLock}
          className={cn(
            'p-2 rounded-lg border-2 transition-all',
            lockRatio
              ? 'border-primary-400 bg-primary-50 text-primary-600'
              : 'border-slate-200 text-slate-400 hover:border-slate-300',
          )}
          title={lockRatio ? 'Пропорции зафиксированы (клик для разблокировки)' : 'Свободное изменение (клик для фиксации)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {lockRatio ? (
              <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
            ) : (
              <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
            )}
          </svg>
        </button>
      </div>

      {/* Height */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Высота</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={height || ''}
            onChange={(e) => actions.setHeight(parseInt(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); actions.setHeight(height + (e.shiftKey ? 10 : 1)); }
              if (e.key === 'ArrowDown') { e.preventDefault(); actions.setHeight(height - (e.shiftKey ? 10 : 1)); }
            }}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min={10} max={16384}
          />
          <span className="text-xs text-slate-400">px</span>
        </div>
      </div>

      {/* Scale */}
      <div className="text-center text-xs text-slate-500 font-medium">{scalePercent}%</div>

      {/* Presets */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">Масштаб</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[25, 50, 75, 100, 150, 200].map((p) => (
            <button
              key={p}
              onClick={() => actions.applyScale(p)}
              className={cn(
                'py-1.5 text-xs rounded-lg border transition-all font-medium',
                scalePercent === p
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-primary-400 hover:text-primary-600',
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Original info */}
      {origW > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Оригинал</span>
            <span className="text-slate-600 font-mono">{origW} × {origH}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Новый</span>
            <span className="text-slate-800 font-mono font-medium">{width} × {height}</span>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
        💡 Arrow keys: ±1px, Shift+Arrow: ±10px
      </div>
    </div>
  );
}
