'use client';

import type { HistoryFilters } from '@/types/history';
import type { JobStatus } from '@/types/job';

interface Props {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
}

export function HistoryFiltersBar({ filters, onChange }: Props) {
  const update = (partial: Partial<HistoryFilters>) => {
    onChange({ ...filters, ...partial, page: 1 }); // Сброс на первую страницу при смене фильтров
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Статус */}
      <select
        value={filters.status || ''}
        onChange={(e) => update({ status: (e.target.value || undefined) as JobStatus | undefined })}
        className="input-field w-auto"
        aria-label="Фильтр по статусу"
      >
        <option value="">Все статусы</option>
        <option value="DONE">Готово</option>
        <option value="ERROR">Ошибка</option>
        <option value="PROCESSING">В обработке</option>
        <option value="QUEUED">В очереди</option>
      </select>

      {/* Тип операции */}
      <select
        value={filters.operationType || ''}
        onChange={(e) => update({ operationType: e.target.value || undefined })}
        className="input-field w-auto"
        aria-label="Фильтр по типу операции"
      >
        <option value="">Все операции</option>
        <option value="image">Изображения</option>
        <option value="pdf">PDF</option>
        <option value="doc">Документы</option>
      </select>

      {/* Дата от */}
      <input
        type="date"
        value={filters.dateFrom || ''}
        onChange={(e) => update({ dateFrom: e.target.value || undefined })}
        className="input-field w-auto"
        aria-label="Дата от"
      />

      {/* Дата до */}
      <input
        type="date"
        value={filters.dateTo || ''}
        onChange={(e) => update({ dateTo: e.target.value || undefined })}
        className="input-field w-auto"
        aria-label="Дата до"
      />

      {/* Сброс */}
      {(filters.status || filters.operationType || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() => onChange({ page: 1, limit: 20 })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
