'use client';

import type { ActionOption } from '@/lib/capability-registry';

interface Props {
  options: ActionOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function GenericPanel({ options, values, onChange }: Props) {
  if (options.length === 0) return null;

  return (
    <div className="panel-body space-y-4">
      {options.map((opt) => (
        <div key={opt.key}>
          <label className="block text-caption font-medium text-txt-muted mb-1.5">{opt.label}</label>

          {opt.type === 'slider' && (
            <div className="flex items-center gap-3">
              <input
                type="range" min={opt.min || 1} max={opt.max || 100} step={opt.step || 1}
                value={values[opt.key] || opt.defaultValue}
                onChange={(e) => onChange(opt.key, e.target.value)}
                className="flex-1 accent-primary h-2"
              />
              <span className="text-caption font-mono text-txt-strong w-8 text-right">
                {values[opt.key] || opt.defaultValue}
              </span>
            </div>
          )}

          {opt.type === 'select' && opt.choices && (
            <select
              value={values[opt.key] || opt.defaultValue}
              onChange={(e) => onChange(opt.key, e.target.value)}
              className="input-field"
            >
              {opt.choices.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          )}

          {opt.type === 'number' && (
            <input
              type="number" min={opt.min} max={opt.max}
              value={values[opt.key] || ''}
              onChange={(e) => onChange(opt.key, e.target.value)}
              className="input-field font-mono"
            />
          )}
        </div>
      ))}
    </div>
  );
}
