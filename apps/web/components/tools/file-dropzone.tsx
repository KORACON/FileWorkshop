'use client';

import { useState, useRef, useCallback } from 'react';
import { cn, formatFileSize } from '@/lib/utils';
import type { Tool } from '@/types/tool';

interface Props {
  tool: Tool;
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ tool, onFileSelect, disabled }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptStr = tool.acceptMime.join(',');
  const maxSizeMB = Math.round(tool.maxFileSize / (1024 * 1024));
  const formatsStr = tool.sourceFormats.map((f) => f.toUpperCase()).join(', ');

  const validateFiles = useCallback((files: File[]): File[] | null => {
    setValidationError(null);

    if (!tool.multiFile && files.length > 1) {
      setValidationError('Можно загрузить только один файл');
      return null;
    }

    for (const file of files) {
      // Размер
      if (file.size > tool.maxFileSize) {
        setValidationError(
          `${file.name}: файл слишком большой (${formatFileSize(file.size)}). Максимум: ${maxSizeMB} МБ`,
        );
        return null;
      }

      // Расширение
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!tool.sourceFormats.includes(ext)) {
        setValidationError(
          `${file.name}: формат .${ext} не поддерживается. Допустимые: ${formatsStr}`,
        );
        return null;
      }
    }

    return files;
  }, [tool, maxSizeMB, formatsStr]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const valid = validateFiles(files);
    if (valid) onFileSelect(valid);
  }, [disabled, validateFiles, onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const valid = validateFiles(files);
    if (valid) onFileSelect(valid);

    // Сброс input чтобы можно было выбрать тот же файл повторно
    e.target.value = '';
  }, [validateFiles, onFileSelect]);

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
        role="button"
        tabIndex={0}
        aria-label="Зона загрузки файлов"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          multiple={tool.multiFile}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        <div className="text-4xl mb-3">{isDragOver ? '📥' : '📁'}</div>
        <p className="text-sm font-medium text-txt-base">
          {isDragOver ? 'Отпустите файл' : 'Перетащите файл сюда'}
        </p>
        <p className="text-xs text-txt-faint mt-1">
          или нажмите для выбора
        </p>
        <p className="text-xs text-txt-faint mt-2">
          {formatsStr} · до {maxSizeMB} МБ
          {tool.multiFile && ' · несколько файлов'}
        </p>
      </div>

      {validationError && (
        <p className="mt-2 text-sm text-error">{validationError}</p>
      )}
    </div>
  );
}

