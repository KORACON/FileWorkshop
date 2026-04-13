'use client';

import { useState, useRef, useCallback } from 'react';
import { cn, formatFileSize } from '@/lib/utils';

const MAX_SIZE = 250 * 1024 * 1024; // 250 MB (начальный тариф)

interface Props {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function UniversalDropzone({ onFileSelect, disabled }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError(`Файл слишком большой (${formatFileSize(file.size)}). Максимум: 250 МБ`);
      return;
    }
    if (file.size === 0) { setError('Файл пустой'); return; }
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) handleFile(files[0]);
  }, [disabled, handleFile]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) handleFile(files[0]);
    e.target.value = '';
  }, [handleFile]);

  return (
    <div>
      <div
        className={cn(
          'dropzone',
          isDragOver && !disabled && 'dropzone-active',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" onChange={handleInput} className="hidden" />

        <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p className="text-body font-medium text-txt-strong mb-1">
          {isDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
        </p>
        <p className="text-small text-txt-muted">
          или <span className="text-primary font-medium">выберите с компьютера</span>
        </p>
      </div>
      {error && <p className="mt-3 text-small text-error text-center">{error}</p>}
    </div>
  );
}
