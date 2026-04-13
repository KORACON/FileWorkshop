import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Форматирование размера файла */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Процент изменения размера */
export function formatSizeDiff(before: number, after: number): string {
  if (before === 0) return '';
  const diff = ((after - before) / before) * 100;
  if (diff > 0) return `+${diff.toFixed(0)}%`;
  return `${diff.toFixed(0)}%`;
}

/** Цвет для отображения diff: зелёный если уменьшился, красный если увеличился */
export function sizeDiffColor(before: number, after: number): string {
  if (after < before) return 'text-green-600';
  if (after > before) return 'text-amber-600';
  return 'text-slate-400';
}

/** Форматирование даты */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/** Извлечение расширения из имени файла */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}
