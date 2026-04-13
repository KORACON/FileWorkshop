'use client';

import { formatFileSize, getFileExtension } from '@/lib/utils';

interface Props {
  file: File;
  onRemove: () => void;
}

const FORMAT_ICONS: Record<string, string> = {
  jpg: '🖼', jpeg: '🖼', png: '🖼', webp: '🖼', avif: '🖼',
  bmp: '🖼', tiff: '🖼', heic: '📱', heif: '📱', gif: '🖼',
  pdf: '📄', docx: '📝', odt: '📝', rtf: '📝',
  txt: '📄', html: '🌐', md: '📋', zip: '🗜',
};

export function FilePreview({ file, onRemove }: Props) {
  const ext = getFileExtension(file.name);
  const icon = FORMAT_ICONS[ext] || '📎';

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
      <span className="text-2xl flex-shrink-0">{icon}</span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
        <p className="text-xs text-slate-400">
          {ext.toUpperCase()} · {formatFileSize(file.size)}
        </p>
      </div>

      <button
        onClick={onRemove}
        className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
        aria-label="Удалить файл"
      >
        ✕
      </button>
    </div>
  );
}
