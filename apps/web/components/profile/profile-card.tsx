'use client';

import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

export function ProfileCard() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const initials = (user.name || user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <div className="card flex items-center gap-4">
      {/* Avatar (инициалы) */}
      <div className="h-14 w-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
        {initials}
      </div>

      <div className="min-w-0">
        {user.name && (
          <h2 className="text-lg font-semibold text-txt-strong truncate">{user.name}</h2>
        )}
        <p className="text-sm text-txt-muted truncate">{user.email}</p>
        <p className="text-xs text-txt-faint mt-1">
          Зарегистрирован {formatDate(user.createdAt || new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}

