import type { Config } from 'tailwindcss';

/**
 * Design System v2 — «Мастерская файлов»
 *
 * Премиальный деловой стиль: графитово-синяя палитра,
 * молочные поверхности, мягкие тени, спокойные акценты.
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
          DEFAULT: '#F3F6FA',   // Холодный светлый фон (не белый)
          soft: '#EAF0F7',      // Альтернативный фон секций
        },
        // ── Surfaces ──
        surface: {
          DEFAULT: '#FCFDFE',   // Карточки, панели (не стерильный белый)
          hover: '#F5F8FC',     // Hover на поверхностях
          alt: '#F0F4FA',       // Вторичные поверхности
        },
        // ── Primary (графитово-синий) ──
        primary: {
          50: '#EDF2F9',
          100: '#DCE7F5',
          200: '#B8CEEA',
          300: '#8BAFD9',
          400: '#5E8FC8',
          500: '#3E6EA0',
          DEFAULT: '#2E5B88',   // Основной акцент
          600: '#2E5B88',
          700: '#264D74',       // Hover / pressed
          800: '#1E3F60',
          900: '#16314C',
        },
        // ── Text ──
        txt: {
          strong: '#16283D',    // Заголовки — глубокий графитово-синий
          base: '#3A4F65',      // Основной текст
          muted: '#68788C',     // Подписи
          faint: '#8E9DAD',     // Placeholder
        },
        // ── Borders ──
        border: {
          DEFAULT: '#D4DDE8',   // Мягкие рамки
          strong: '#B8C9D9',    // Акцентные рамки
        },
        // ── Status ──
        success: { DEFAULT: '#2D8A57', light: '#E3F5EC', text: '#1E6B40' },
        error:   { DEFAULT: '#C95A5A', light: '#FBEAEA', text: '#A63D3D' },
        warning: { DEFAULT: '#C08A30', light: '#FDF4E3', text: '#8A6420' },
        info:    { DEFAULT: '#2E5B88', light: '#EDF2F9', text: '#264D74' },
      },
      fontFamily: {
        display: ['Unbounded', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'hero': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'h3': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        'micro': ['0.6875rem', { lineHeight: '1.3', fontWeight: '500' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(22, 40, 61, 0.05), 0 1px 2px rgba(22, 40, 61, 0.03)',
        'card-hover': '0 4px 14px rgba(22, 40, 61, 0.08), 0 1px 3px rgba(22, 40, 61, 0.04)',
        'panel': '0 2px 8px rgba(22, 40, 61, 0.06)',
        'dropdown': '0 8px 28px rgba(22, 40, 61, 0.12), 0 2px 6px rgba(22, 40, 61, 0.05)',
        'button': '0 1px 2px rgba(22, 40, 61, 0.06)',
        'focus': '0 0 0 3px rgba(46, 91, 136, 0.15)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'badge': '6px',
        'input': '8px',
      },
      spacing: {
        'section': '4rem',
        'block': '2rem',
        'element': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
