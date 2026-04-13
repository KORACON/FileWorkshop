'use client';

import { useState } from 'react';
import { useHistory } from '@/hooks/use-history';
import { HistoryFiltersBar } from '@/components/profile/history-filters';
import { HistoryTable } from '@/components/profile/history-table';
import { Pagination } from '@/components/shared/pagination';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';

export default function HistoryPage() {
  const {
    items, meta, isLoading, filters, setFilters, setPage,
    deleteEntry, clearAll, deletingId,
  } = useHistory();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">История операций</h1>
        {meta.total > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Очистить всё
            </button>

            {showClearConfirm && (
              <div className="absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-4 w-64">
                <p className="text-sm text-slate-700 mb-3">
                  Удалить всю историю? Это действие нельзя отменить.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { clearAll(); setShowClearConfirm(false); }}
                    className="btn-danger text-xs px-3 py-1.5"
                  >
                    Удалить
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <HistoryFiltersBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <LoadingState variant="skeleton" rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Нет операций"
          description={filters.status || filters.operationType ? 'Попробуйте изменить фильтры' : 'Загрузите файл и выполните первую операцию'}
          action={!(filters.status || filters.operationType) ? { label: 'Начать работу', href: '/' } : undefined}
        />
      ) : (
        <>
          <div className="text-sm text-slate-400">
            {meta.total > 0 ? `Найдено: ${meta.total}` : ''}
          </div>

          <HistoryTable
            items={items}
            onDelete={deleteEntry}
            isDeleting={deletingId}
          />

          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
