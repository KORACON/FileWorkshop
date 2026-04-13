'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { HistoryFilters, HistoryResponse } from '@/types/history';

export function useHistory() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<HistoryFilters>({ page: 1, limit: 20 });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Построение query string из фильтров
  const queryString = buildQueryString(filters);

  const { data, isLoading, error } = useQuery({
    queryKey: ['history', queryString],
    queryFn: async () => {
      const res = await api.get<HistoryResponse>(`/api/history?${queryString}`);
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const deleteEntry = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/history/${id}`);
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    } catch {
      // Ошибка удаления — можно показать toast
    } finally {
      setDeletingId(null);
    }
  }, [queryClient]);

  const clearAll = useCallback(async () => {
    try {
      await api.delete('/api/history');
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    } catch {
      // Ошибка
    }
  }, [queryClient]);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    items: data?.items || [],
    meta: data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading,
    error: error ? String(error) : null,
    filters,
    setFilters,
    setPage,
    deleteEntry,
    clearAll,
    deletingId,
  };
}

function buildQueryString(filters: HistoryFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.operationType) params.set('operationType', filters.operationType);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return params.toString();
}
