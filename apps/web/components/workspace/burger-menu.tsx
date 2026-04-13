'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { CapabilityAction } from '@/lib/capability-registry';

interface Props {
  actions: CapabilityAction[];
  currentAction: CapabilityAction | null;
  onSelect: (action: CapabilityAction) => void;
}

export function BurgerMenu({ actions, currentAction, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const special = actions.filter((a) => a.group === 'special');
  const process = actions.filter((a) => a.group === 'process');
  const convert = actions.filter((a) => a.group === 'convert');

  const handleSelect = (action: CapabilityAction) => { onSelect(action); setOpen(false); };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-button text-small font-medium transition-all',
          open ? 'bg-primary text-white shadow-button' : 'bg-surface border border-border text-txt-base hover:border-border-strong',
        )}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect y="2" width="16" height="1.5" rx="0.75" />
          <rect y="7.25" width="16" height="1.5" rx="0.75" />
          <rect y="12.5" width="16" height="1.5" rx="0.75" />
        </svg>
        <span>{currentAction ? currentAction.name : 'Действия'}</span>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={cn('transition-transform', open && 'rotate-180')}>
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-card shadow-dropdown z-50 py-1.5 max-h-[70vh] overflow-y-auto">
          {special.length > 0 && (
            <>
              {special.map((a) => <MenuItem key={a.id} action={a} active={currentAction?.id === a.id} onSelect={handleSelect} highlight />)}
              <div className="border-t border-border my-1" />
            </>
          )}

          {process.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-micro text-txt-faint uppercase tracking-wider">Обработать</div>
              {process.map((a) => <MenuItem key={a.id} action={a} active={currentAction?.id === a.id} onSelect={handleSelect} />)}
            </>
          )}

          {convert.length > 0 && (
            <>
              <div className="border-t border-border my-1" />
              <div className="px-3 py-1.5 text-micro text-txt-faint uppercase tracking-wider">Конвертировать</div>
              {convert.map((a) => <MenuItem key={a.id} action={a} active={currentAction?.id === a.id} onSelect={handleSelect} />)}
            </>
          )}

          {actions.length === 0 && (
            <div className="px-3 py-4 text-small text-txt-faint text-center">Нет доступных действий</div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ action, active, onSelect, highlight }: {
  action: CapabilityAction; active: boolean; onSelect: (a: CapabilityAction) => void; highlight?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(action)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-sm',
        active ? 'bg-primary-50 text-primary-700' : 'hover:bg-bg-soft text-txt-base',
        highlight && !active && 'bg-purple-50 hover:bg-purple-100 text-purple-800',
      )}
    >
      <span className="text-body flex-shrink-0">{action.icon}</span>
      <div className="min-w-0">
        <p className="text-small font-medium">{action.name}</p>
        <p className="text-micro text-txt-faint truncate">{action.description}</p>
      </div>
      {active && <span className="ml-auto text-primary text-micro">✓</span>}
    </button>
  );
}
