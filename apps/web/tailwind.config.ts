import type { Config } from 'tailwindcss';

/**
 * Design System v3 — «Мастерская файлов»
 *
 * Премиальная палитра: тёмный navy + стальной + тёплое золото.
 * Японская эстетика: глубина, спокойствие, дороговизна.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Из палитры ──
        navy:    { DEFAULT: '#071739', light: '#0D2450' },
        steel:   { DEFAULT: '#4B6382', light: '#5A7494' },
        silver:  { DEFAULT: '#A4B5C4', light: '#B8C6D2' },
        ash:     { DEFAULT: '#CDD5DB', light: '#DDE3E8' },
        bronze:  { DEFAULT: '#A68868', light: '#B89A7C' },
        sand:    { DEFAULT: '#E3C39D', light: '#EDD4B5' },

        // ── Backgrounds ──
        bg: {
          DEFAULT: '#F0F2F5',   // Светлый нейтральный (не белый)
          soft: '#E8ECF0',      // Вторичный фон секций
          dark: '#071739',      // Тёмные секции (CTA, hero accent)
        },
        // ── Surfaces ──
        surface: {
          DEFAULT: '#FAFBFC',   // Карточки
          hover: '#F3F5F8',     // Hover
          alt: '#EDF0F4',       // Вторичные
        },
        // ── Primary (navy-gold) ──
        primary: {
          50: '#F0F3F8',
          100: '#D9E0EC',
          200: '#B3C1D9',
          300: '#8DA2C6',
          400: '#6783B3',
          DEFAULT: '#4B6382',   // Стальной синий — основной акцент
          500: '#4B6382',
          600: '#3D5570',
          700: '#071739',       // Navy — hover/pressed/заголовки
          800: '#0D2450',
          900: '#071739',
        },
        // ── Accent (тёплое золото) ──
        accent: {
          DEFAULT: '#A68868',   // Бронзовый — CTA, выделения
          light: '#E3C39D',     // Песочный — hover, фоны
          dark: '#8A7054',      // Тёмный бронзовый
          50: '#FAF5EE',
          100: '#F2E6D4',
          200: '#E3C39D',
        },
        // ── Text ──
        txt: {
          strong: '#071739',    // Navy — заголовки
          base: '#2D3E52',      // Тёмный стальной — основной текст
          muted: '#6B7D8F',     // Стальной — подписи
          faint: '#A4B5C4',     // Серебристый — placeholder
          light: '#FAFBFC',     // Белый — на тёмном фоне
        },
        // ── Borders ──
        border: {
          DEFAULT: '#CDD5DB',   // Ash
          strong: '#A4B5C4',    // Silver
          accent: '#A68868',    // Bronze accent border
        },
        // ── Status ──
        success: { DEFAULT: '#3D8B5E', light: '#E5F2EB', text: '#2A6B44' },
        error:   { DEFAULT: '#C45454', light: '#FAE8E8', text: '#A03838' },
        warning: { DEFAULT: '#B8883A', light: '#FBF2E3', text: '#8A6628' },
        info:    { DEFAULT: '#4B6382', light: '#E8EDF3', text: '#3D5570' },
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
        'card': '0 1px 4px rgba(7, 23, 57, 0.06), 0 1px 2px rgba(7, 23, 57, 0.03)',
        'card-hover': '0 6px 16px rgba(7, 23, 57, 0.08), 0 2px 4px rgba(7, 23, 57, 0.04)',
        'panel': '0 2px 10px rgba(7, 23, 57, 0.07)',
        'dropdown': '0 10px 30px rgba(7, 23, 57, 0.14), 0 2px 8px rgba(7, 23, 57, 0.06)',
        'button': '0 1px 3px rgba(7, 23, 57, 0.08)',
        'focus': '0 0 0 3px rgba(75, 99, 130, 0.2)',
        'gold': '0 4px 14px rgba(166, 136, 104, 0.25)',
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
