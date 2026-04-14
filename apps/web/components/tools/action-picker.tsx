'use client';

import type { Tool } from '@/types/tool';

interface Props {
  tools: Tool[];
  fileCategory: { type: string; icon: string; label: string };
  onSelect: (tool: Tool) => void;
}

export function ActionPicker({ tools, fileCategory, onSelect }: Props) {
  // Группируем: конвертации, обработка, специальные
  const conversions = tools.filter((t) => t.targetFormat && !t.operationType.includes('remove_bg'));
  const operations = tools.filter((t) => !t.targetFormat);
  const special = tools.filter((t) => t.operationType.includes('remove_bg'));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-txt-muted">Что сделать с файлом?</p>
      </div>

      {/* Специальные (убрать фон и т.д.) — показываем первыми, крупно */}
      {special.length > 0 && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {special.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelect(tool)}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary-soft hover:border-primary-hover hover:bg-primary-100 transition-all text-left group"
              >
                <span className="text-3xl">{tool.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-primary group-hover:text-primary-ring">
                    {tool.name.ru}
                  </p>
                  <p className="text-xs text-txt-muted">{tool.description.ru}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Конвертации */}
      {conversions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-txt-muted mb-3">Конвертировать в</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {conversions.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelect(tool)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-surface-hover transition-all text-left group"
              >
                <span className="text-2xl">{tool.icon}</span>
                <div>
                  <p className="text-sm font-medium text-txt-strong group-hover:text-primary">
                    {tool.targetFormat?.toUpperCase()}
                  </p>
                  <p className="text-xs text-txt-faint">{tool.name.ru}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Операции (resize, compress, rotate и т.д.) */}
      {operations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-txt-muted mb-3">Обработать</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {operations.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelect(tool)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-surface-hover transition-all text-left group"
              >
                <span className="text-2xl">{tool.icon}</span>
                <div>
                  <p className="text-sm font-medium text-txt-strong group-hover:text-primary">
                    {tool.name.ru}
                  </p>
                  <p className="text-xs text-txt-faint">{tool.description.ru}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tools.length === 0 && (
        <div className="text-center py-8">
          <p className="text-txt-faint">Для этого типа файла пока нет доступных операций</p>
        </div>
      )}
    </div>
  );
}

