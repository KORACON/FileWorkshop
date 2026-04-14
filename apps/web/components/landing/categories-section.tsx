'use client';

import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';

const categories = [
  { icon: '🖼', name: 'Изображения', desc: 'JPG, PNG, WEBP, AVIF, HEIC, SVG', href: '/tools/images', examples: 'Конвертация, сжатие, resize, удаление фона' },
  { icon: '📄', name: 'PDF', desc: 'Сжатие, разделение, извлечение', href: '/tools/pdf', examples: 'Compress, split, rotate, в изображения' },
  { icon: '📝', name: 'Документы', desc: 'DOCX, TXT, MD, HTML, ODT', href: '/tools/documents', examples: 'В PDF, в TXT, Markdown ↔ HTML' },
];

export function CategoriesSection() {
  return (
    <section className="section-soft">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-h1 font-display text-txt-strong mb-2">Поддерживаемые форматы</h2>
            <p className="text-body text-txt-muted">Работайте с изображениями, PDF и документами в одном месте</p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-5">
          {categories.map((cat, i) => (
            <ScrollReveal key={cat.name} delay={i * 0.1}>
              <Link href={cat.href} className="card-interactive p-5 block h-full">
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="text-h3 text-txt-strong mb-1">{cat.name}</h3>
                <p className="text-small text-txt-muted mb-3">{cat.desc}</p>
                <p className="text-caption text-primary">{cat.examples}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
