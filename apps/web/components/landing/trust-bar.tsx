'use client';

import { ScrollReveal } from './scroll-reveal';

const items = [
  { icon: '🔒', text: 'Безопасная обработка' },
  { icon: '⚡', text: 'Результат за секунды' },
  { icon: '📋', text: 'История операций' },
  { icon: '🌐', text: '20+ форматов' },
];

export function TrustBar() {
  return (
    <ScrollReveal>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 py-4">
        {items.map((item) => (
          <div key={item.text} className="flex items-center gap-1.5 text-small text-txt-muted">
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}
