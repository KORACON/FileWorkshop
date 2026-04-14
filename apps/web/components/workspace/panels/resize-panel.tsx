'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { ResizeState, ResizeActions } from '@/hooks/use-resize-state';

type Unit = 'px' | '%' | 'mm' | 'cm' | 'in';

const PX_PER: Record<Unit, number> = { px: 1, '%': 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };
const UNIT_LABELS: Record<Unit, string> = { px: 'пикс', '%': '%', mm: 'мм', cm: 'см', in: 'дюйм' };
const UNITS: Unit[] = ['px', '%', 'mm', 'cm', 'in'];

interface Props {
  state: ResizeState;
  actions: ResizeActions;
  onUnitChange?: (unit: string) => void;
}

export function ResizePanel({ state, actions, onUnitChange }: Props) {
  const { origW, origH, width, height, lockRatio, scalePercent } = state;
  const [unit, setUnit] = useState<Unit>('px');

  // Convert px → display unit
  const toDisplay = useCallback((px: number): number => {
    if (unit === '%') return origW > 0 ? Math.round((px / origW) * 100 * 10) / 10 : 100;
    return Math.round((px / PX_PER[unit]) * 100) / 100;
  }, [unit, origW]);

  // Convert display unit → px
  const toPx = useCallback((val: number): number => {
    if (unit === '%') return Math.round(origW * val / 100);
    return Math.round(val * PX_PER[unit]);
  }, [unit, origW]);

  const displayW = toDisplay(width);
  const displayH = toDisplay(height);
  const displayOrigW = toDisplay(origW);
  const displayOrigH = toDisplay(origH);

  const step = unit === 'px' ? 1 : unit === '%' ? 1 : 0.1;
  const bigStep = unit === 'px' ? 10 : unit === '%' ? 10 : 1;

  const handleW = (val: number) => actions.setWidth(toPx(val));
  const handleH = (val: number) => actions.setHeight(toPx(val));

  const handleUnitChange = (u: Unit) => {
    setUnit(u);
    onUnitChange?.(u);
  };

  return (
    <div className="panel-body space-y-5">

      {/* ── Единицы измерения ── */}
      <div className="flex p-0.5 bg-bg-soft rounded-button">
        {UNITS.map((u) => (
          <button
            key={u}
            onClick={() => handleUnitChange(u)}
            className={cn(
              'flex-1 py-1.5 text-caption font-medium rounded-badge transition-all duration-150',
              unit === u
                ? 'bg-surface shadow-button text-txt-strong'
                : 'text-txt-faint hover:text-txt-muted',
            )}
          >
            {u}
          </button>
        ))}
      </div>

      {/* ── Ширина ── */}
      <div>
        <label className="block text-caption font-medium text-txt-muted mb-1.5">Ширина</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={displayW}
            onChange={(e) => handleW(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); handleW(displayW + (e.shiftKey ? bigStep : step)); }
              if (e.key === 'ArrowDown') { e.preventDefault(); handleW(displayW - (e.shiftKey ? bigStep : step)); }
            }}
            step={step}
            className="input-field font-mono text-center"
          />
          <span className="text-caption text-txt-faint w-10 flex-shrink-0 text-right">{UNIT_LABELS[unit]}</span>
        </div>
      </div>

      {/* ── Связь пропорций ── */}
      <div className="flex justify-center">
        <button
          onClick={actions.toggleLock}
          className={cn(
            'p-2 rounded-button border-2 transition-all duration-150',
            lockRatio
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border text-txt-faint hover:border-border-strong',
          )}
          title={lockRatio ? 'Пропорции зафиксированы' : 'Свободное изменение'}
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

      {/* ── Высота ── */}
      <div>
        <label className="block text-caption font-medium text-txt-muted mb-1.5">Высота</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={displayH}
            onChange={(e) => handleH(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); handleH(displayH + (e.shiftKey ? bigStep : step)); }
              if (e.key === 'ArrowDown') { e.preventDefault(); handleH(displayH - (e.shiftKey ? bigStep : step)); }
            }}
            step={step}
            className="input-field font-mono text-center"
          />
          <span className="text-caption text-txt-faint w-10 flex-shrink-0 text-right">{UNIT_LABELS[unit]}</span>
        </div>
      </div>

      {/* ── Масштаб ── */}
      <div className="text-center text-caption text-txt-muted">
        {scalePercent}% от оригинала
      </div>

      {/* ── Сравнение размеров ── */}
      {origW > 0 && (
        <div className="bg-bg-soft rounded-card p-3 space-y-1.5">
          <div className="flex justify-between text-caption">
            <span className="text-txt-muted">Оригинал</span>
            <span className="font-mono text-txt-base">{displayOrigW} × {displayOrigH} {unit}</span>
          </div>
          <div className="flex justify-between text-caption">
            <span className="text-txt-muted">Новый</span>
            <span className="font-mono text-txt-strong font-semibold">{displayW} × {displayH} {unit}</span>
          </div>
        </div>
      )}

      {/* ── Горячие клавиши ── */}
      <div className="bg-bg-soft rounded-card p-3 space-y-2">
        <p className="text-micro text-txt-muted font-semibold mb-2">💡 Горячие клавиши</p>
        <HintRow keys="Ctrl + Z" desc="Отменить последнее действие" />
        <HintRow keys="Shift + ↑↓" desc={`Изменить на ${bigStep} ${UNIT_LABELS[unit]}`} />
        <HintRow keys="↑ ↓ в поле" desc={`Точная подстройка на ${step} ${UNIT_LABELS[unit]}`} />
        <HintRow keys="Tab" desc="Переключиться между шириной и высотой" />
        <HintRow keys="Enter" desc="Применить изменения" />
      </div>
    </div>
  );
}

function HintRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 text-micro">
      <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 font-mono text-txt-muted flex-shrink-0 text-center whitespace-nowrap">
        {keys}
      </kbd>
      <span className="text-txt-faint leading-relaxed">{desc}</span>
    </div>
  );
}
