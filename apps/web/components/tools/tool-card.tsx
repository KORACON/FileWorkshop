import Link from 'next/link';
import type { Tool } from '@/types/tool';

interface Props {
  tool: Tool;
}

export function ToolCard({ tool }: Props) {
  return (
    <Link
      href={`/tools/${tool.category}/${tool.id}`}
      className="card hover:border-primary-300 hover:shadow-md transition-all duration-150 group"
    >
      <div className="text-3xl mb-3">{tool.icon}</div>
      <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
        {tool.name.ru}
      </h3>
      <p className="text-sm text-slate-500 mt-1">{tool.description.ru}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {tool.sourceFormats.slice(0, 3).map((f) => (
          <span key={f} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
            .{f}
          </span>
        ))}
        {tool.targetFormat && (
          <>
            <span className="text-xs text-slate-400">→</span>
            <span className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">
              .{tool.targetFormat}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
