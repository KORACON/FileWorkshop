'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Data ──

type Period = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  badge?: string;
  monthly: number;
  yearly: number;
  fileLimit: string;
  fileLimitNote?: string;
  opsPerDay: string;
  batch: string;
  history: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'start',
    name: 'Начальный',
    monthly: 0,
    yearly: 0,
    fileLimit: 'до 250 МБ',
    opsPerDay: '15 операций / день',
    batch: '—',
    history: '7 дней',
    features: [
      'Конвертация изображений',
      'Сжатие и resize',
      'Удаление фона',
      'Сжатие PDF',
      'DOCX → PDF',
    ],
    highlighted: false,
    cta: 'Начать бесплатно',
  },
  {
    id: 'plus',
    name: 'Plus',
    badge: 'Популярный',
    monthly: 299,
    yearly: 2990,
    fileLimit: 'до 1 ТБ',
    fileLimitNote: 'Для типичных задач ограничений нет',
    opsPerDay: '100 операций / день',
    batch: 'до 10 файлов',
    history: '90 дней',
    features: [
      'Все базовые инструменты',
      'Пакетная обработка',
      'Приоритетная очередь',
      'Пресеты операций',
      'Расширенные PDF-инструменты',
    ],
    highlighted: true,
    cta: 'Выбрать Plus',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 699,
    yearly: 6990,
    fileLimit: 'Высокий лимит',
    fileLimitNote: 'Индивидуальные ограничения по запросу',
    opsPerDay: '500 операций / день',
    batch: 'до 50 файлов',
    history: '365 дней',
    features: [
      'Всё из Plus',
      'Массовая обработка',
      'Размеры для маркетплейсов',
      'Водяной знак',
      'Безлимитные пресеты',
    ],
    highlighted: false,
    cta: 'Выбрать Pro',
  },
];

function calcSavings(m: number, y: number) {
  if (m === 0) return { effective: 0, saved: 0, percent: 0 };
  const effective = Math.round((y / 12) * 100) / 100;
  const saved = m * 12 - y;
  const percent = Math.round((saved / (m * 12)) * 100);
  return { effective, saved, percent };
}

export default function PricingPage() {
  const [period, setPeriod] = useState<Period>('yearly');

  return (
    <div className="bg-bg min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-hero font-display text-txt-strong mb-3">Тарифы</h1>
          <p className="text-body text-txt-muted max-w-lg mx-auto">
            Базовые инструменты бесплатны навсегда. Расширенные возможности — для тех, кому нужно больше.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 bg-surface border border-border rounded-button shadow-card">
            <button
              onClick={() => setPeriod('monthly')}
              className={cn(
                'px-5 py-2 rounded-badge text-small font-medium transition-all duration-200',
                period === 'monthly'
                  ? 'bg-accent text-white shadow-button'
                  : 'text-txt-muted hover:text-txt-base',
              )}
            >
              Помесячно
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={cn(
                'px-5 py-2 rounded-badge text-small font-medium transition-all duration-200 relative',
                period === 'yearly'
                  ? 'bg-accent text-white shadow-button'
                  : 'text-txt-muted hover:text-txt-base',
              )}
            >
              За год
              <span className="absolute -top-2.5 -right-2 bg-success text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const s = calcSavings(plan.monthly, plan.yearly);
            const isYearly = period === 'yearly';
            const price = plan.monthly === 0 ? 0 : isYearly ? s.effective : plan.monthly;

            return (
              <motion.div
                key={plan.id}
                layout
                className={cn(
                  'relative flex flex-col rounded-card p-6',
                  plan.highlighted
                    ? 'bg-surface border-2 border-accent shadow-card-hover ring-2 ring-accent-100'
                    : 'bg-surface border border-border shadow-card',
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-micro font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Name */}
                <h2 className="text-h2 text-txt-strong mt-1">{plan.name}</h2>

                {/* Price */}
                <div className="mt-4 mb-1">
                  {price === 0 ? (
                    <span className="text-hero font-display text-txt-strong">0 ₽</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <motion.span
                        key={`${plan.id}-${period}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-hero font-display text-txt-strong"
                      >
                        {Math.round(price)} ₽
                      </motion.span>
                      <span className="text-small text-txt-faint">/мес</span>
                    </div>
                  )}
                </div>

                {/* Savings */}
                {isYearly && s.saved > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <span className="badge badge-success text-micro">−{s.percent}%</span>
                    <span className="text-micro text-txt-faint">
                      {plan.yearly} ₽/год · экономия {s.saved} ₽
                    </span>
                  </motion.div>
                )}

                {!isYearly && plan.monthly > 0 && (
                  <p className="text-micro text-txt-faint mb-3">
                    или {plan.yearly} ₽/год <span className="text-success font-medium">(выгоднее на {s.percent}%)</span>
                  </p>
                )}

                {plan.monthly === 0 && <p className="text-micro text-txt-faint mb-3">Бесплатно навсегда</p>}

                {/* Limits block */}
                <div className="bg-bg-soft rounded-card p-3 mb-5 space-y-2">
                  <Row label="Размер файла" value={plan.fileLimit} bold />
                  <Row label="Операций" value={plan.opsPerDay} />
                  <Row label="Пакетная" value={plan.batch} />
                  <Row label="История" value={plan.history} />
                  {plan.fileLimitNote && (
                    <p className="text-micro text-txt-faint pt-1 border-t border-border">{plan.fileLimitNote}</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-small text-txt-base">
                      <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/register"
                  className={cn(
                    'block text-center py-3 rounded-button font-medium text-body transition-all duration-150',
                    plan.highlighted
                      ? 'btn-primary w-full'
                      : 'btn-secondary w-full',
                  )}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="text-h2 text-txt-strong text-center mb-8">Частые вопросы</h3>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { q: 'Можно ли пользоваться бесплатно?', a: 'Да. Начальный тариф бесплатен навсегда. Конвертация, сжатие, resize и удаление фона доступны без оплаты.' },
              { q: 'Что значит «высокий лимит» на Pro?', a: 'На тарифе Pro стандартные ограничения по размеру файла значительно выше. Для нестандартных задач свяжитесь с поддержкой.' },
              { q: 'Можно ли отменить подписку?', a: 'Да, в любой момент. Доступ сохраняется до конца оплаченного периода.' },
              { q: 'Безопасны ли мои файлы?', a: 'Файлы обрабатываются на сервере и автоматически удаляются. Мы не храним и не передаём ваши данные третьим лицам.' },
            ].map(({ q, a }) => (
              <div key={q} className="card p-5">
                <p className="text-small font-semibold text-txt-strong mb-1.5">{q}</p>
                <p className="text-small text-txt-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-caption">
      <span className="text-txt-muted">{label}</span>
      <span className={cn('font-mono', bold ? 'text-txt-strong font-semibold' : 'text-txt-base')}>{value}</span>
    </div>
  );
}
