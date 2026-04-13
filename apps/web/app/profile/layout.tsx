'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/profile', label: 'Обзор', icon: '👤' },
  { href: '/profile/history', label: 'История', icon: '📋' },
  { href: '/profile/settings', label: 'Настройки', icon: '⚙️' },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <nav className="md:w-56 flex-shrink-0">
            <div className="flex md:flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-txt-base hover:bg-bg-soft hover:text-txt-strong',
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

