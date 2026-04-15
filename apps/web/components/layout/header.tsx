'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { formatFileSize } from '@/lib/utils';
import { ProfileDropdown } from './profile-dropdown';

export function Header() {
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();
  const ws = useWorkspaceStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);

  const hasSession = ws.state !== 'idle' && ws.file !== null;
  const isOnWorkspace = pathname === '/';

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal]);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (!hasSession) return; // нет сессии — обычный переход

    e.preventDefault();

    if (!isOnWorkspace) {
      // Пользователь на другой странице → возвращаем к файлу
      router.push('/');
    } else {
      // Уже на workspace → показываем модалку
      setShowModal(true);
    }
  };

  const handleContinue = () => {
    setShowModal(false);
    // Остаёмся в текущей сессии
  };

  const handleStartNew = () => {
    setShowModal(false);
    ws.reset();
    // reset переключит state в idle → landing page покажется
  };

  const ext = ws.file?.name.split('.').pop()?.toUpperCase() || '';

  return (
    <>
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Мастерская файлов" width={32} height={32} className="rounded-lg" />
              <span className="font-display font-semibold text-txt-strong text-body">Мастерская файлов</span>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/tools" className="btn-ghost">Инструменты</Link>
              <Link href="/formats" className="btn-ghost">Форматы</Link>
              <Link href="/pricing" className="btn-ghost">Тарифы</Link>
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="h-8 w-20 skeleton rounded-button" />
              ) : isAuthenticated && user ? (
                <ProfileDropdown name={user.name || null} email={user.email} onLogout={logout} />
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">Войти</Link>
                  <Link href="/register" className="btn-primary text-small py-2 px-4">Регистрация</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Session Modal ── */}
      <AnimatePresence>
        {showModal && ws.file && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-txt-strong/25 backdrop-blur-sm z-[100]"
              onClick={handleContinue}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed inset-0 flex items-center justify-center z-[101] p-4"
            >
              <div className="bg-surface rounded-card border border-border shadow-dropdown w-full max-w-md p-8">
                {/* Icon */}
                <div className="w-14 h-14 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4B6382" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-h2 font-display text-txt-strong text-center mb-2">
                  Незавершённая сессия
                </h2>
                <p className="text-body text-txt-muted text-center mb-5">
                  У вас осталась незавершённая работа с файлом
                </p>

                {/* File info */}
                <div className="flex items-center gap-3 p-3 bg-bg-soft rounded-card border border-border mb-6">
                  <div className="w-10 h-10 bg-surface rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{ws.fileInfo?.familyIcon || '📎'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium text-txt-strong truncate">{ws.file.name}</p>
                    <p className="text-micro text-txt-faint">{ext} · {formatFileSize(ws.file.size)}</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2.5">
                  <button onClick={handleContinue} className="btn-primary w-full py-3 text-body">
                    Продолжить работу
                  </button>
                  <button onClick={handleStartNew} className="btn-secondary w-full py-3 text-body">
                    Начать заново
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
