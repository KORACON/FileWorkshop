'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { ProfileDropdown } from './profile-dropdown';

export function Header() {
  const { isAuthenticated, user, logout, isLoading } = useAuthStore();

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-txt-strong font-bold text-body">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                <path d="M10 2v3h3" fill="none" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <span>Мастерская файлов</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/tools" className="btn-ghost">Инструменты</Link>
            <Link href="/pricing" className="btn-ghost">Тарифы</Link>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-8 w-20 skeleton rounded-button" />
            ) : isAuthenticated && user ? (
              <ProfileDropdown
                name={user.name || null}
                email={user.email}
                onLogout={logout}
              />
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
  );
}
