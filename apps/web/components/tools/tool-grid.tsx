import type { Tool } from '@/types/tool';
import { ToolCard } from './tool-card';

interface Props {
  tools: Tool[];
  emptyMessage?: string;
}

export function ToolGrid({ tools, emptyMessage = 'Инструменты не найдены' }: Props) {
  if (tools.length === 0) {
    return (
      <p className="text-center text-slate-400 py-12">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
