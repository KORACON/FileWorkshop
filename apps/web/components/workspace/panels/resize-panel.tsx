'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ResizeState, ResizeActions } from '@/hooks/use-resize-state';

type Unit = 'px' | 'mm' | 'cm' | 'in';

// Conversion: 1 inch = 96 px (CSS standard), 1 inch = 25.4 mm, 1 inch = 2.54 cm
const PX_PER_UNIT: Record<Unit, number> = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };
const UNIT_LABELS: Record<Unit, string> = { px: 'px', mm: 'мм', cm: 'см', in: 'дюйм' };
const UNITS: Unit[] = ['px', 'mm', 'cm', 'in'];

function pxToUnit(px: number, unit: Unit): number {
  return Math.round((px / PX_PER_UNIT[unit]) * 100) / 100;
}
function unitToPx(value: number, unit: Unit): number {
  return Math.round(value * PX_PER_UNIT[unit]);
}

interface Props {
  state: ResizeState;
  actions: ResizeActions;
}

export function ResizePanel({ state, actions }: Props) {
  const { origW, origH, width, height, lockRatio, scalePercent } = state;
  const [unit, setUnit] = useState<Unit>('px');

  // Display values in current unit
  const displayW = unit === 'px' ? width : pxToUnit(width, unit);
  const displayH = unit === 'px' ? height : pxToUnit(height, unit);
  const displayOrigW = unit === 'px' ? origW : pxToUnit(origW, unit);
  const displayOrigH = unit === 'px' ? origH : pxToUnit(origH, unit);

  const handleWidthChange = (val: number) => {
    const px = unit === 'px' ? val : unitToPx(val, unit);
    actions.setWidth(px);
  };

  const handleHeightChange = (val: number) => {
    const px = unit === 'px' ? val : unitToPx(val, unit);
    actions.setHeight(px);
  };

  const step = unit === 'px' ? 1 : 0.1;
  const bigStep = unit === 'px' ? 10 : 1;

  return (
    <div className="panel-body space-y-5">

      {/* ── Unit selector ── */}
      <div className="flex p-0.5 bg-bg-soft rounded-button">
        {UNITS.map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
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

      {/* ── Width ── */}
      <div>
        <label className="block text-caption font-medium text-txt-muted mb-1.5">Ширина</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={unit === 'px' ? (displayW || '') : displayW}
            onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); handleWidthChange(displayW + (e.shiftKey ? bigStep : step)); }
              if (e.key === 'ArrowDown') { e.preventDefault(); handleWidthChange(displayW - (e.shiftKey ? bigStep : step)); }
            }}
            step={step}
            className="input-field font-mono text-center"
          />
          <span className="text-caption text-txt-faint w-8 flex-shrink-0">{UNIT_LABELS[unit]}</span>
        </div>
      </div>

      {/* ── Lock ratio ── */}
      <div className="flex justify-center">
        <button
          onClick={actions.toggleLock}
          className={cn(
            'p-2 rounded-button border-2 transition-all duration-150',
            lockRatio
              ? 'border-primary bg-primary-50 text-primary'
              : 'border-border text-txt-faint hover:border-border-strong',
          )}
          title={lockRatio ? 'Пропорции зафиксированы' : 'Свободное изменение'}
          aria-label={lockRatio ? 'Разблокировать пропорции' : 'Зафиксировать пропорции'}
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

      {/* ── Height ── */}
      <div>
        <label className="block text-caption font-medium text-txt-muted mb-1.5">Высота</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={unit === 'px' ? (displayH || '') : displayH}
            onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); handleHeightChange(displayH + (e.shiftKey ? bigStep : step)); }
              if (e.key === 'ArrowDown') { e.preventDefault(); handleHeightChange(displayH - (e.shiftKey ? bigStep : step)); }
            }}
            step={step}
            className="input-field font-mono text-center"
          />
          <span className="text-caption text-txt-faint w-8 flex-shrink-0">{UNIT_LABELS[unit]}</span>
        </div>
      </div>

      {/* ── Scale indicator ── */}
      <div className="text-center">
        <span className="text-caption text-txt-muted">{scalePercent}% от оригинала</span>
      </div>

      {/* ── Size comparison ── */}
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

      {/* ── Keyboard hints ── */}
      <div className="bg-bg-soft rounded-card p-3 space-y-1">
        <p className="text-micro text-txt-faint font-medium mb-1.5">Управление</p>
        <HintRow keys="Перетаскивание" desc="Изменить размер мышкой" />
        <HintRow keys="↑ ↓" desc={`±${step} ${unit}`} />
        <HintRow keys="Shift + ↑ ↓" desc={`±${bigStep} ${unit}`} />
        <HintRow keys="Alt + drag" desc="Симметрично по двум сторонам" />
        <HintRow keys="Shift + drag" desc="Масштабирование по всем сторонам" />
      </div>
    </div>
  );
}

function HintRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 text-micro">
      <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 font-mono text-txt-muted flex-shrink-0 min-w-[60px] text-center">
        {keys}
      </kbd>
      <span className="text-txt-faint">{desc}</span>
    </div>
  );
}
