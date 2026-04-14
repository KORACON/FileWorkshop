'use client';

import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';

export function CtaSection() {
  return (
    <section className="section">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="bg-navy rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-h1 font-display text-txt-light mb-3">Готовы начать?</h2>
            <p className="text-body text-silver mb-6 max-w-md mx-auto">
              Базовые инструменты бесплатны. Зарегистрируйтесь для доступа к истории, пакетной обработке и расширенным функциям.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="bg-accent text-white font-medium px-6 py-3 rounded-button hover:bg-accent-dark transition-colors text-body shadow-gold">
                Создать аккаунт
              </Link>
              <Link href="/pricing" className="border border-silver/40 text-txt-light font-medium px-6 py-3 rounded-button hover:bg-white/10 transition-colors text-body">
                Посмотреть тарифы
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
