import Link from 'next/link';
import type { Tool } from '@/types/tool';

interface Props {
  tool: Tool;
}

export function ToolCard({ tool }: Props) {
  return (
    <Link
      href={`/tools/${tool.category}/${tool.id}`}
      className="card hover:border-border-strong hover:shadow-card-hover transition-all duration-150 group"
    >
      <div className="text-3xl mb-3">{tool.icon}</div>
      <h3 className="font-semibold text-txt-strong group-hover:text-accent transition-colors">
        {tool.name.ru}
      </h3>
      <p className="text-sm text-txt-muted mt-1">{tool.description.ru}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {tool.sourceFormats.slice(0, 3).map((f) => (
          <span key={f} className="text-xs bg-bg-soft text-txt-muted px-1.5 py-0.5 rounded">
            .{f}
          </span>
        ))}
        {tool.targetFormat && (
          <>
            <span className="text-xs text-txt-faint">→</span>
            <span className="text-xs bg-accent-50 text-accent-dark px-1.5 py-0.5 rounded">
              .{tool.targetFormat}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

