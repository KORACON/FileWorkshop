'use client';

import { useState, useCallback } from 'react';
import { cn, formatFileSize } from '@/lib/utils';
import type { Tool } from '@/types/tool';

interface Props {
  tool: Tool;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

/**
 * Компонент для загрузки нескольких файлов.
 * Используется для pdf.merge и других batch-операций.
 * Поддерживает drag-and-drop, переупорядочивание и удаление.
 */
export function BatchUploader({ tool, files, onFilesChange }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  const maxSizeMB = Math.round(tool.maxFileSize / (1024 * 1024));
  const formatsStr = tool.sourceFormats.map((f) => f.toUpperCase()).join(', ');

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return tool.sourceFormats.includes(ext) && f.size <= tool.maxFileSize;
    });
    onFilesChange([...files, ...valid]);
  }, [files, onFilesChange, tool]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  const moveFile = useCallback((from: number, to: number) => {
    const newFiles = [...files];
    const [moved] = newFiles.splice(from, 1);
    newFiles.splice(to, 0, moved);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  return (
    <div className="space-y-3">
      {/* Список файлов */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-2 p-2 bg-bg-soft rounded-lg">
              <span className="text-xs text-txt-faint w-6 text-center">{i + 1}</span>
              <span className="text-sm text-txt-base truncate flex-1">{file.name}</span>
              <span className="text-xs text-txt-faint">{formatFileSize(file.size)}</span>

              {/* Кнопки перемещения */}
              <button
                onClick={() => i > 0 && moveFile(i, i - 1)}
                disabled={i === 0}
                className="text-xs text-txt-faint hover:text-txt-base disabled:opacity-30 px-1"
                aria-label="Переместить вверх"
              >↑</button>
              <button
                onClick={() => i < files.length - 1 && moveFile(i, i + 1)}
                disabled={i === files.length - 1}
                className="text-xs text-txt-faint hover:text-txt-base disabled:opacity-30 px-1"
                aria-label="Переместить вниз"
              >↓</button>

              <button
                onClick={() => removeFile(i)}
                className="text-xs text-red-400 hover:text-error px-1"
                aria-label="Удалить файл"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone для добавления */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragOver ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-400',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = tool.acceptMime.join(',');
          input.onchange = () => {
            if (input.files) addFiles(Array.from(input.files));
          };
          input.click();
        }}
        role="button"
        tabIndex={0}
      >
        <p className="text-sm text-txt-muted">
          {files.length === 0 ? 'Перетащите файлы сюда' : '+ Добавить ещё файлы'}
        </p>
        <p className="text-xs text-txt-faint mt-1">{formatsStr} · до {maxSizeMB} МБ</p>
      </div>

      {files.length > 0 && (
        <p className="text-xs text-txt-faint">
          {files.length} файлов · {formatFileSize(files.reduce((s, f) => s + f.size, 0))}
        </p>
      )}
    </div>
  );
}

