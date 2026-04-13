import type { Config } from 'tailwindcss';

/**
 * Design System — «Мастерская файлов»
 *
 * Деловой product UI: светлый холодный фон, белые поверхности,
 * синий акцент, мягкие тени, чёткая типографика.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──
        bg: {
          DEFAULT: '#F4F7FB',   // Основной фон страниц (не белый!)
          soft: '#EEF3FA',      // Вторичный фон секций
        },
        // ── Surfaces ──
        surface: {
          DEFAULT: '#FFFFFF',   // Карточки, панели, модалки
          hover: '#F8FAFC',     // Hover на поверхностях
        },
        // ── Primary (синий) ──
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          DEFAULT: '#2563EB',   // Primary action
          600: '#2563EB',
          700: '#1D4ED8',       // Hover / pressed
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // ── Text ──
        txt: {
          strong: '#0F172A',    // Заголовки
          base: '#334155',      // Основной текст
          muted: '#64748B',     // Подписи
          faint: '#94A3B8',     // Placeholder
        },
        // ── Borders ──
        border: {
          DEFAULT: '#D9E3F0',   // Мягкие рамки
          strong: '#B8C9E0',    // Акцентные рамки
        },
        // ── Status ──
        success: { DEFAULT: '#16A34A', light: '#DCFCE7', text: '#15803D' },
        error: { DEFAULT: '#DC2626', light: '#FEE2E2', text: '#B91C1C' },
        warning: { DEFAULT: '#D97706', light: '#FEF3C7', text: '#92400E' },
        info: { DEFAULT: '#2563EB', light: '#DBEAFE', text: '#1D4ED8' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Типографическая шкала
        'hero': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],     // 36px
        'h1': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],        // 24px
        'h2': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],      // 20px
        'h3': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],          // 16px
        'body': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],    // 14px
        'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],  // 13px
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],  // 12px
        'micro': ['0.6875rem', { lineHeight: '1.3', fontWeight: '500' }],  // 11px
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'panel': '0 2px 8px rgba(15, 23, 42, 0.05)',
        'dropdown': '0 8px 24px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.04)',
        'button': '0 1px 2px rgba(15, 23, 42, 0.05)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'badge': '6px',
        'input': '8px',
      },
      spacing: {
        'section': '4rem',     // 64px — между секциями
        'block': '2rem',       // 32px — между блоками
        'element': '1rem',     // 16px — между элементами
      },
    },
  },
  plugins: [],
};

export default config;
