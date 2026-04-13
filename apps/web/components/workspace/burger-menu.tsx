'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize } from '@/lib/utils';
import type { CapabilityAction } from '@/lib/capability-registry';
import type { FileInfo } from '@/lib/capability-registry';

interface Props {
  actions: CapabilityAction[];
  currentAction: CapabilityAction | null;
  onSelect: (action: CapabilityAction) => void;
  file: File;
  fileInfo: FileInfo | null;
}

const GROUP_META: Record<string, { label: string; icon: string }> = {
  quick:    { label: 'Быстрые действия', icon: '⚡' },
  edit:     { label: 'Редактирование',   icon: '✏️' },
  optimize: { label: 'Оптимизация',      icon: '📦' },
  convert:  { label: 'Конвертация',       icon: '🔄' },
  extra:    { label: 'Дополнительно',     icon: '⚙️' },
};

const GROUP_ORDER: string[] = ['quick', 'edit', 'optimize', 'convert', 'extra'];

export function BurgerMenu({ actions, currentAction, onSelect, file, fileInfo }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [open]);

  // Group actions
  const groups = new Map<string, CapabilityAction[]>();
  for (const a of actions) {
    const list = groups.get(a.group) || [];
    list.push(a);
    groups.set(a.group, list);
  }

  const handleSelect = (action: CapabilityAction) => { onSelect(action); setOpen(false); };
  const ext = file.name.split('.').pop()?.toUpperCase() || '';

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-button text-small font-medium transition-all',
          open ? 'bg-primary text-white shadow-button' : 'bg-surface border border-border text-txt-base hover:border-border-strong hover:shadow-card',
        )}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect y="2" width="16" height="1.5" rx="0.75" />
          <rect y="7.25" width="16" height="1.5" rx="0.75" />
          <rect y="12.5" width="16" height="1.5" rx="0.75" />
        </svg>
        <span>{currentAction ? currentAction.name : 'Действия'}</span>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={cn('transition-transform duration-200', open && 'rotate-180')}>
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-0 top-full mt-2 w-80 bg-surface border border-border rounded-card shadow-dropdown z-50 overflow-hidden"
          >
            {/* File summary */}
            <div className="px-4 py-3 bg-bg-soft border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 bg-surface rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-body">{fileInfo?.familyIcon || '📎'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-small font-medium text-txt-strong truncate">{file.name}</p>
                <p className="text-micro text-txt-faint">
                  {ext} · {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            {/* Action groups */}
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {GROUP_ORDER.map((groupId) => {
                const items = groups.get(groupId);
                if (!items || items.length === 0) return null;
                const meta = GROUP_META[groupId];

                return (
                  <div key={groupId}>
                    <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                      <span className="text-micro">{meta.icon}</span>
                      <span className="text-micro text-txt-faint uppercase tracking-wider font-medium">{meta.label}</span>
                    </div>
                    {items.map((a) => (
                      <ActionItem key={a.id} action={a} active={currentAction?.id === a.id} onSelect={handleSelect} isQuick={groupId === 'quick'} />
                    ))}
                  </div>
                );
              })}

              {actions.length === 0 && (
                <div className="px-4 py-6 text-small text-txt-faint text-center">Нет доступных действий</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionItem({ action, active, onSelect, isQuick }: {
  action: CapabilityAction; active: boolean; onSelect: (a: CapabilityAction) => void; isQuick?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(action)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150',
        active
          ? 'bg-primary-50 text-primary-700 border-l-2 border-primary'
          : 'hover:bg-bg-soft text-txt-base border-l-2 border-transparent',
        isQuick && !active && 'bg-primary-50/50',
      )}
    >
      <span className="text-body flex-shrink-0 w-6 text-center">{action.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-small font-medium">{action.name}</p>
        <p className="text-micro text-txt-faint truncate">{action.description}</p>
      </div>
      {active && (
        <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4l3 3 5-5" />
          </svg>
        </span>
      )}
    </button>
  );
}
