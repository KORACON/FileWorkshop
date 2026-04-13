import { notFound } from 'next/navigation';
import { getToolsByCategory, getAllCategories } from '../_data/tools-registry';
import { ToolGrid } from '@/components/tools/tool-grid';
import Link from 'next/link';

interface Props {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const categories = getAllCategories();
  const cat = categories.find((c) => c.id === category);

  if (!cat) notFound();

  const categoryTools = getToolsByCategory(category);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/tools" className="hover:text-slate-600">Инструменты</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">{cat.name.ru}</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{cat.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{cat.name.ru}</h1>
          <p className="text-sm text-slate-500">{categoryTools.length} инструментов</p>
        </div>
      </div>

      <ToolGrid tools={categoryTools} />
    </div>
  );
}
