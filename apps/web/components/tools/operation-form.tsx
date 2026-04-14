'use client';

import { useState, useEffect } from 'react';
import type { ToolOption } from '@/types/tool';

interface Props {
  options: ToolOption[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

/**
 * Динамическая форма параметров операции.
 * Генерируется из tool.options — не нужно писать отдельную форму для каждого инструмента.
 */
export function OperationForm({ options, values, onChange }: Props) {
  if (options.length === 0) return null;

  const update = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-txt-base">Параметры</h3>

      {options.map((opt) => (
        <div key={opt.key}>
          <label className="block text-sm text-txt-base mb-1">
            {opt.label.ru}
          </label>

          {opt.type === 'slider' && (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={opt.min || 1}
                max={opt.max || 100}
                step={opt.step || 1}
                value={values[opt.key] || opt.default}
                onChange={(e) => update(opt.key, e.target.value)}
                className="flex-1 accent-accent"
              />
              <span className="text-sm font-medium text-txt-base w-10 text-right">
                {values[opt.key] || opt.default}
              </span>
            </div>
          )}

          {opt.type === 'select' && opt.choices && (
            <select
              value={values[opt.key] || opt.default}
              onChange={(e) => update(opt.key, e.target.value)}
              className="input-field"
            >
              {opt.choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label.ru}
                </option>
              ))}
            </select>
          )}

          {opt.type === 'number' && (
            <input
              type="number"
              min={opt.min}
              max={opt.max}
              value={values[opt.key] || ''}
              onChange={(e) => update(opt.key, e.target.value)}
              placeholder={opt.placeholder?.ru || ''}
              className="input-field"
            />
          )}

          {opt.type === 'text' && (
            <input
              type="text"
              value={values[opt.key] || ''}
              onChange={(e) => update(opt.key, e.target.value)}
              placeholder={opt.placeholder?.ru || ''}
              className="input-field"
            />
          )}

          {opt.type === 'pages' && (
            <input
              type="text"
              value={values[opt.key] || ''}
              onChange={(e) => update(opt.key, e.target.value)}
              placeholder="1,3,5-7,10"
              className="input-field"
            />
          )}

          {opt.helpText && (
            <p className="mt-1 text-xs text-txt-faint">{opt.helpText.ru}</p>
          )}
        </div>
      ))}
    </div>
  );
}

