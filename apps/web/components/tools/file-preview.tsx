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
    <div className="flex items-center gap-3 p-3 bg-bg-soft border border-border rounded-lg">
      <span className="text-2xl flex-shrink-0">{icon}</span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-txt-strong truncate">{file.name}</p>
        <p className="text-xs text-txt-faint">
          {ext.toUpperCase()} · {formatFileSize(file.size)}
        </p>
      </div>

      <button
        onClick={onRemove}
        className="text-txt-faint hover:text-error transition-colors flex-shrink-0 p-1"
        aria-label="Удалить файл"
      >
        ✕
      </button>
    </div>
  );
}

