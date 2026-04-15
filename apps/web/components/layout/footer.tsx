'use client';

import { useState } from 'react';
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
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function Footer() {
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);

  return (
    <footer className="bg-navy text-txt-light mt-auto">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Columns */}
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

          {/* Language selector column */}
          <div>
            <h3 className="text-caption font-semibold text-white uppercase tracking-wider mb-4">
              Язык
            </h3>
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-navy-light border border-steel/30 rounded-button text-small text-silver hover:text-white hover:border-steel/50 transition-all duration-150"
              >
                <span className="text-body">{currentLang.flag}</span>
                <span className="flex-1 text-left">{currentLang.label}</span>
                <svg
                  width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M1 1l4 4 4-4" />
                </svg>
              </button>

              {langOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-navy-light border border-steel/30 rounded-card shadow-dropdown z-10 py-1 overflow-hidden">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setCurrentLang(lang); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-small text-left transition-colors duration-100 ${
                        currentLang.code === lang.code
                          ? 'text-white bg-steel/20'
                          : 'text-silver hover:text-white hover:bg-steel/10'
                      }`}
                    >
                      <span className="text-body">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-steel/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5 text-small text-silver">
              <Image src="/logo.png" alt="" width={20} height={20} className="rounded opacity-70" />
              <span>© {new Date().getFullYear()} Мастерская файлов. Все права защищены.</span>
            </div>
            <div className="flex items-center gap-4 text-micro text-steel">
              <Link href="/privacy" className="hover:text-silver transition-colors">Конфиденциальность</Link>
              <span className="text-steel/40">·</span>
              <Link href="/terms" className="hover:text-silver transition-colors">Условия</Link>
              <span className="text-steel/40">·</span>
              <Link href="/cookies" className="hover:text-silver transition-colors">Cookie</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
