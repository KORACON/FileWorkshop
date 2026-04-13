'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getToolById, getAllCategories } from '../../_data/tools-registry';
import { ToolPageContent } from '@/components/tools/tool-page-content';

interface Props {
  params: Promise<{ category: string; tool: string }>;
}

export default function ToolPage({ params }: Props) {
  const { category, tool: toolId } = use(params);
  const tool = getToolById(toolId);
  const categories = getAllCategories();
  const cat = categories.find((c) => c.id === category);

  if (!tool || !cat || tool.category !== category) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/tools" className="hover:text-slate-600">Инструменты</Link>
        <span className="mx-2">›</span>
        <Link href={`/tools/${category}`} className="hover:text-slate-600">{cat.name.ru}</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">{tool.name.ru}</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{tool.icon}</span>
          <h1 className="text-2xl font-bold text-slate-900">{tool.name.ru}</h1>
        </div>
        <p className="text-slate-500">{tool.description.ru}</p>

        {/* Форматы */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
          <span>Форматы:</span>
          {tool.sourceFormats.map((f) => (
            <span key={f} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">.{f}</span>
          ))}
          {tool.targetFormat && (
            <>
              <span>→</span>
              <span className="bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">.{tool.targetFormat}</span>
            </>
          )}
        </div>
      </div>

      {/* Основной контент: upload → process → result */}
      <ToolPageContent tool={tool} />
    </div>
  );
}
