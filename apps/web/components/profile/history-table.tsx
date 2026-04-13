'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatDate, formatFileSize, formatSizeDiff, sizeDiffColor } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import type { HistoryEntry, RepeatData } from '@/types/history';

interface Props {
  items: HistoryEntry[];
  onDelete: (id: string) => void;
  isDeleting: string | null;
}

export function HistoryTable({ items, onDelete, isDeleting }: Props) {
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const { getAccessToken } = await import('@/lib/api-client');
      const token = getAccessToken();
      const res = await fetch(`/api/files/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Ошибка скачивания' } }));
        alert(err.error?.message || 'Ошибка скачивания');
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/);
      const filename = m ? decodeURIComponent(m[1].replace(/"/g, '')) : 'result';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка скачивания файла');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRepeat = async (id: string) => {
    try {
      const res = await api.post<RepeatData>(`/api/history/${id}/repeat`);
      const data = res.data;
      // Переход на страницу инструмента с параметрами
      const params = new URLSearchParams({
        operationType: data.operationType,
        sourceFormat: data.sourceFormat,
        ...(data.targetFormat && { targetFormat: data.targetFormat }),
      });
      router.push(`/tools?repeat=true&${params.toString()}`);
    } catch {
      // Тихо игнорируем — пользователь может повторить вручную
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-txt-faint text-sm">Нет операций</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-bg-soft rounded-lg"
        >
          {/* Статус + файл */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <StatusBadge status={item.status} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-txt-strong truncate">
                {item.originalFilename}
              </p>
              <p className="text-xs text-txt-faint">
                {formatOperationType(item.operationType)}
                {item.targetFormat && ` → ${item.targetFormat.toUpperCase()}`}
                {' · '}
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>

          {/* Размеры */}
          <div className="text-xs text-txt-muted flex-shrink-0 sm:text-right">
            <span>{formatFileSize(item.fileSizeBefore)}</span>
            {item.fileSizeAfter != null && (
              <>
                <span className="mx-1">→</span>
                <span>{formatFileSize(item.fileSizeAfter)}</span>
                <span className={`ml-1 ${sizeDiffColor(item.fileSizeBefore, item.fileSizeAfter)}`}>
                  ({formatSizeDiff(item.fileSizeBefore, item.fileSizeAfter)})
                </span>
              </>
            )}
          </div>

          {/* Действия */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.status === 'DONE' && (
              <button
                onClick={() => handleDownload(item.id)}
                disabled={downloadingId === item.id}
                className="text-xs text-primary-600 hover:text-primary-500 font-medium disabled:opacity-50"
                title="Скачать результат"
              >
                ⬇ Скачать
              </button>
            )}

            <button
              onClick={() => handleRepeat(item.id)}
              className="text-xs text-txt-muted hover:text-txt-base"
              title="Повторить операцию"
            >
              🔄
            </button>

            <button
              onClick={() => onDelete(item.id)}
              disabled={isDeleting === item.id}
              className="text-xs text-error hover:text-error-text disabled:opacity-50"
              title="Удалить из истории"
            >
              {isDeleting === item.id ? '...' : '✕'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatOperationType(type: string): string {
  const map: Record<string, string> = {
    'image.convert': 'Конвертация',
    'image.resize': 'Resize',
    'image.compress': 'Сжатие',
    'image.rotate': 'Поворот',
    'image.remove_exif': 'Удаление EXIF',
    'image.crop': 'Обрезка',
    'pdf.merge': 'Объединение PDF',
    'pdf.split': 'Разделение PDF',
    'pdf.compress': 'Сжатие PDF',
    'pdf.rotate': 'Поворот PDF',
    'pdf.extract_pages': 'Извлечение страниц',
    'pdf.to_images': 'PDF → изображения',
    'pdf.from_images': 'Изображения → PDF',
    'pdf.remove_metadata': 'Удаление метаданных',
    'pdf.reorder': 'Перестановка страниц',
    'doc.convert': 'Конвертация документа',
  };
  return map[type] || type;
}

