'use client';

import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';

export function CtaSection() {
  return (
    <section className="section">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="bg-primary rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-h1 text-white mb-3">Готовы начать?</h2>
            <p className="text-body text-primary-200 mb-6 max-w-md mx-auto">
              Базовые инструменты бесплатны. Зарегистрируйтесь для доступа к истории, пакетной обработке и расширенным функциям.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="bg-surface text-primary font-medium px-6 py-3 rounded-button hover:bg-primary-50 transition-colors text-body">
                Создать аккаунт
              </Link>
              <Link href="/pricing" className="border border-white/30 text-white font-medium px-6 py-3 rounded-button hover:bg-surface/10 transition-colors text-body">
                Посмотреть тарифы
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

