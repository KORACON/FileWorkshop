import { tools, getAllCategories, getPopularTools } from './_data/tools-registry';
import { ToolGrid } from '@/components/tools/tool-grid';
import Link from 'next/link';

export default function ToolsPage() {
  const categories = getAllCategories();
  const popular = getPopularTools();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Инструменты</h1>
      <p className="text-slate-500 mb-8">Выберите категорию или инструмент</p>

      {/* Категории */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/tools/${cat.id}`}
            className="card hover:border-primary-300 hover:shadow-md transition-all text-center group"
          >
            <div className="text-3xl mb-2">{cat.icon}</div>
            <h2 className="font-semibold text-slate-900 group-hover:text-primary-600">
              {cat.name.ru}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{cat.count} инструментов</p>
          </Link>
        ))}
      </div>

      {/* Популярные */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Популярные</h2>
      <ToolGrid tools={popular} />
    </div>
  );
}
