'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CapabilityAction } from '@/lib/capability-registry';
import type { FileInfo } from '@/lib/capability-registry';

interface Props {
  actions: CapabilityAction[];
  currentAction: CapabilityAction | null;
  onSelect: (action: CapabilityAction) => void;
  file: File;
  fileInfo: FileInfo | null;
  onReplaceFile: (newFile: File) => void;
}

interface MenuCategory {
  id: string;
  label: string;
  groups: string[];
  /** 'right' = flyout вправо, 'down' = аккордеон вниз */
  expandDir: 'right' | 'down';
}

const CATEGORIES: MenuCategory[] = [
  { id: 'convert', label: 'Конвертация', groups: ['convert'], expandDir: 'right' },
  { id: 'edit', label: 'Редактирование', groups: ['quick', 'edit', 'optimize'], expandDir: 'down' },
  { id: 'extra', label: 'Дополнительно', groups: ['extra'], expandDir: 'down' },
];

function getActionLabel(action: CapabilityAction): string {
  if (action.group === 'convert' && action.targetFormat) {
    return action.targetFormat.toUpperCase();
  }
  return action.name;
}

export function BurgerMenu({ actions, currentAction, onSelect, file, fileInfo, onReplaceFile }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedDown, setExpandedDown] = useState<string | null>(null);
  const [hoveredRight, setHoveredRight] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setExpandedDown(null); setHoveredRight(null); }
    };
    document.addEventListener('keydown', escHandler);
    return () => document.removeEventListener('keydown', escHandler);
  }, [open]);

  const categoryActions = useCallback((catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return [];
    return actions.filter((a) => cat.groups.includes(a.group));
  }, [actions]);

  const handleSelect = (action: CapabilityAction) => {
    onSelect(action);
    setOpen(false);
    setExpandedDown(null);
    setHoveredRight(null);
  };

  const handleReplaceFile = () => {
    setOpen(false);
    setExpandedDown(null);
    setHoveredRight(null);
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) onReplaceFile(files[0]);
    e.target.value = '';
  };

  const toggleDown = (catId: string) => {
    setExpandedDown((prev) => (prev === catId ? null : catId));
  };

  const availableCategories = CATEGORIES.filter((cat) => categoryActions(cat.id).length > 0);

  return (
    <>
      <input ref={fileInputRef} type="file" onChange={handleFileInput} className="hidden" />

      {/* Trigger */}
      <button
        onClick={() => { setOpen(!open); setExpandedDown(null); setHoveredRight(null); }}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-button text-small font-medium transition-all',
          open
            ? 'bg-surface-alt text-txt-strong shadow-button'
            : 'bg-surface border border-border text-txt-base hover:border-border-strong hover:shadow-card',
        )}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect y="2" width="16" height="1.5" rx="0.75" />
          <rect y="7.25" width="16" height="1.5" rx="0.75" />
          <rect y="12.5" width="16" height="1.5" rx="0.75" />
        </svg>
        <span>{currentAction ? getActionLabel(currentAction) : 'Действия'}</span>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={cn('transition-transform duration-200', open && 'rotate-180')}>
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {/* Full-height panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-bg/60 z-40"
              onClick={() => { setOpen(false); setExpandedDown(null); setHoveredRight(null); }}
            />

            {/* Left panel */}
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed left-0 top-[57px] bottom-0 w-56 bg-surface border-r border-border shadow-panel z-50 flex flex-col overflow-visible"
            >
              <div className="flex-1 overflow-visible py-2">
                {availableCategories.map((cat) => {
                  const items = categoryActions(cat.id);
                  const hasActiveChild = items.some((a) => a.id === currentAction?.id);

                  if (cat.expandDir === 'right') {
                    // ── Flyout вправо (конвертация) ──
                    const isHovered = hoveredRight === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className="relative"
                      >
                        <button
                          onClick={() => setHoveredRight((prev) => (prev === cat.id ? null : cat.id))}
                          className={cn(
                            'w-full flex items-center justify-between px-5 py-3 text-left text-small font-medium transition-all duration-100',
                            isHovered ? 'bg-bg-soft text-txt-strong' : 'text-txt-base hover:bg-bg-soft',
                            hasActiveChild && !isHovered && 'text-accent',
                          )}
                        >
                          <span>{cat.label}</span>
                          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M1 1l4 4-4 4" />
                          </svg>
                        </button>

                        <AnimatePresence>
                          {isHovered && items.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              transition={{ duration: 0.12 }}
                              className="absolute left-full top-0 ml-0.5 bg-surface border border-border rounded-card shadow-dropdown z-50 py-1.5"
                            >
                              {items.map((action) => {
                                const isActive = currentAction?.id === action.id;
                                return (
                                  <button
                                    key={action.id}
                                    onClick={() => handleSelect(action)}
                                    className={cn(
                                      'w-full text-left px-5 py-2 text-small whitespace-nowrap transition-all duration-100',
                                      isActive
                                        ? 'bg-primary-soft text-primary font-medium'
                                        : 'text-txt-base hover:bg-bg-soft hover:text-txt-strong',
                                    )}
                                  >
                                    {getActionLabel(action)}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // ── Аккордеон вниз (редактирование, дополнительно) ──
                  const isExpanded = expandedDown === cat.id;
                  return (
                    <div key={cat.id}>
                      <button
                        onClick={() => toggleDown(cat.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-5 py-3 text-left text-small font-medium transition-all duration-100',
                          isExpanded ? 'bg-bg-soft text-txt-strong' : 'text-txt-base hover:bg-bg-soft',
                          hasActiveChild && !isExpanded && 'text-accent',
                        )}
                      >
                        <span>{cat.label}</span>
                        <svg
                          width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                          className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
                        >
                          <path d="M1 1l4 4 4-4" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="py-1 bg-bg-soft/50">
                              {items.map((action) => {
                                const isActive = currentAction?.id === action.id;
                                return (
                                  <button
                                    key={action.id}
                                    onClick={() => handleSelect(action)}
                                    className={cn(
                                      'w-full text-left pl-8 pr-5 py-2.5 text-small transition-all duration-100',
                                      isActive
                                        ? 'bg-primary-soft text-primary font-medium'
                                        : 'text-txt-base hover:bg-bg-soft hover:text-txt-strong',
                                    )}
                                  >
                                    {getActionLabel(action)}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Replace file — bottom */}
              <div className="border-t border-border p-3">
                <button
                  onClick={handleReplaceFile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-small text-txt-muted hover:bg-bg-soft hover:text-txt-base transition-all duration-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Заменить файл</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
