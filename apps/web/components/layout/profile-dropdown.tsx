'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  name: string | null;
  email: string;
  onLogout: () => void;
}

export function ProfileDropdown({ name, email, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', clickHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const displayName = name || email.split('@')[0];
  const initials = (name || email).split(/[\s@]/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-button transition-all duration-150',
          open ? 'bg-bg-soft' : 'hover:bg-bg-soft',
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 bg-primary-soft text-primary rounded-full flex items-center justify-center text-caption font-bold flex-shrink-0">
          {initials}
        </div>
        <span className="text-small text-txt-base font-medium hidden sm:block max-w-[120px] truncate">
          {displayName}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={cn('text-txt-faint transition-transform duration-200 hidden sm:block', open && 'rotate-180')}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-card shadow-dropdown z-50 overflow-hidden"
          >
            {/* User info */}
            <div className="px-4 py-3 bg-bg-soft border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-soft text-primary rounded-full flex items-center justify-center text-body font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  {name && <p className="text-small font-semibold text-txt-strong truncate">{name}</p>}
                  <p className="text-micro text-txt-muted truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <DropdownItem href="/profile" icon={profileIcon} label="Профиль" onClick={() => setOpen(false)} />
              <DropdownItem href="/profile/history" icon={historyIcon} label="История" onClick={() => setOpen(false)} />
              <DropdownItem href="/profile/settings" icon={settingsIcon} label="Настройки" onClick={() => setOpen(false)} />
            </div>

            <div className="border-t border-border py-1">
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-small text-error hover:bg-error-light transition-colors duration-150"
              >
                {logoutIcon}
                <span>Выйти</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-small text-txt-base hover:bg-bg-soft transition-colors duration-150"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

const profileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const historyIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const settingsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const logoutIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
