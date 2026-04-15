'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

const COLUMNS: FooterColumn[] = [
  {
    title: 'Главная',
    links: [
      { label: 'Главная страница', href: '/' },
      { label: 'Инструменты', href: '/tools' },
      { label: 'Форматы', href: '/formats' },
      { label: 'Тарифы', href: '/pricing' },
    ],
  },
  {
    title: 'Инструменты',
    links: [
      { label: 'Конвертация изображений', href: '/tools/images' },
      { label: 'Сжатие файлов', href: '/tools/images' },
      { label: 'Работа с PDF', href: '/tools/pdf' },
      { label: 'Конвертация документов', href: '/tools/documents' },
      { label: 'Удаление фона', href: '/tools/images' },
    ],
  },
  {
    title: 'Компания',
    links: [
      { label: 'О нас', href: '/about' },
      { label: 'Блог', href: '/blog' },
      { label: 'Связаться с нами', href: '/contact' },
      { label: 'Вопросы и ответы', href: '/faq' },
    ],
  },
  {
    title: 'Защита данных',
    links: [
      { label: 'Конфиденциальность', href: '/privacy' },
      { label: 'Условия использования', href: '/terms' },
      { label: 'Cookie-файлы', href: '/cookies' },
      { label: 'Безопасность', href: '/security' },
    ],
  },
];

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

export function Footer() {
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);
  const langRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  return (
    <footer className="bg-navy text-txt-light mt-auto">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-caption font-semibold text-white uppercase tracking-wider mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-small text-silver hover:text-white transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-steel/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* Left: copyright */}
            <div className="flex items-center gap-4 text-small text-silver">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={20} height={20} className="rounded opacity-70" />
                <span>© {new Date().getFullYear()} Мастерская файлов</span>
              </div>
              <span className="text-steel/40 hidden sm:inline">·</span>
              <Link href="/privacy" className="text-micro text-steel hover:text-silver transition-colors hidden sm:inline">Конфиденциальность</Link>
              <span className="text-steel/40 hidden sm:inline">·</span>
              <Link href="/terms" className="text-micro text-steel hover:text-silver transition-colors hidden sm:inline">Условия</Link>
            </div>

            {/* Right: language selector */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 text-small text-silver hover:text-white transition-colors duration-150"
              >
                {/* Globe icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                <span>{currentLang.label}</span>
                <svg
                  width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className={`transition-transform duration-200 opacity-50 ${langOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M1 1l3 3 3-3" />
                </svg>
              </button>

              {/* Dropdown — opens upward */}
              {langOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-44 bg-navy-light border border-steel/30 rounded-card shadow-dropdown py-1 overflow-hidden">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setCurrentLang(lang); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-small text-left transition-colors duration-100 ${
                        currentLang.code === lang.code
                          ? 'text-white bg-steel/20'
                          : 'text-silver hover:text-white hover:bg-steel/10'
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
