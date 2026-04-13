'use client';

import { ScrollReveal } from './scroll-reveal';

const benefits = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Быстрое начало',
    text: 'Загрузите файл и сразу увидите, что с ним можно сделать — без лишних шагов и поиска нужного инструмента.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Много задач в одном сервисе',
    text: 'Изображения, PDF, документы и утилиты собраны в одном рабочем пространстве вместо десятков разных сайтов.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Понятный процесс',
    text: 'Каждая операция выглядит одинаково: файл, параметры, предпросмотр, обработка, скачивание результата.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
    title: 'История и повтор действий',
    text: 'Повторяйте прошлые операции без повторной настройки и отслеживайте результат по истории.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Безопасная обработка',
    text: 'Файлы обрабатываются на сервере и автоматически удаляются. Разумные ограничения и управляемое хранение.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    title: 'Подходит для регулярной работы',
    text: 'Повседневный инструмент для учёбы, работы и подготовки файлов — не одноразовый сервис.',
  },
];

export function BenefitsSection() {
  return (
    <section className="section">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-h1 text-txt-strong mb-2">Почему Мастерская файлов</h2>
            <p className="text-body text-txt-muted max-w-lg mx-auto">
              Один сервис вместо десятков вкладок. Понятный процесс вместо хаоса.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 0.08}>
              <div className="card-interactive p-5 h-full">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
                  {b.icon}
                </div>
                <h3 className="text-h3 text-txt-strong mb-1.5">{b.title}</h3>
                <p className="text-small text-txt-muted leading-relaxed">{b.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
