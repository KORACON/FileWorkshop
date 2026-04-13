'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import type { Session } from '@/types/user';

export function SessionsList() {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get<Session[]>('/api/auth/sessions');
      return res.data;
    },
  });

  const revokeSession = async (id: string) => {
    await api.delete(`/api/auth/sessions/${id}`);
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const revokeAll = async () => {
    await api.delete('/api/auth/sessions');
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-txt-strong">Активные сессии</h3>
        {sessions && sessions.length > 1 && (
          <button onClick={revokeAll} className="text-sm text-error hover:text-error-text">
            Завершить все остальные
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-bg-soft rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !sessions?.length ? (
        <p className="text-sm text-txt-faint">Нет активных сессий</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session, idx) => (
            <div key={session.id} className="flex items-center justify-between p-3 bg-bg-soft rounded-lg">
              <div>
                <p className="text-sm text-txt-base">
                  {parseUserAgent(session.userAgent)}
                  {idx === 0 && (
                    <span className="ml-2 text-xs text-success font-medium">Текущая</span>
                  )}
                </p>
                <p className="text-xs text-txt-faint">
                  IP: {session.ipAddress || '—'} · {formatDate(session.createdAt)}
                </p>
              </div>
              {idx !== 0 && (
                <button
                  onClick={() => revokeSession(session.id)}
                  className="text-xs text-error hover:text-error-text"
                >
                  Завершить
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Неизвестное устройство';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return ua.substring(0, 50);
}

