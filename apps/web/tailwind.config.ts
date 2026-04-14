import type { Config } from 'tailwindcss';

/**
 * Design System v4 — «Мастерская файлов»
 *
 * Premium dark palette: deep navy + teal accent + gold premium.
 * Calm luxury, high-trust, modern SaaS aesthetic.
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
          DEFAULT: '#0B1220',
          soft: '#111A2B',
          alt: '#162235',
        },
        // ── Surfaces ──
        surface: {
          DEFAULT: '#18263A',
          hover: '#243752',
          alt: '#1D2D44',
          pressed: '#2A4060',
        },
        // ── Primary accent (teal) ──
        primary: {
          DEFAULT: '#2EC5B6',
          hover: '#26AE9F',
          active: '#1F9488',
          soft: '#163D42',
          ring: '#57D9CC',
          50: '#163D42',
          100: '#1A4A4F',
          200: '#26AE9F',
        },
        // ── Premium accent (gold) ──
        accent: {
          DEFAULT: '#C9A56A',
          hover: '#B79257',
          soft: '#3A2E1C',
          dark: '#B79257',
          50: '#3A2E1C',
          100: '#4A3D28',
          200: '#C9A56A',
        },
        // ── Text ──
        txt: {
          strong: '#F3F7FC',
          base: '#B7C4D6',
          muted: '#8697AD',
          faint: '#5E7088',
          light: '#F3F7FC',
        },
        // ── Borders ──
        border: {
          DEFAULT: '#2B3D57',
          strong: '#3F5E87',
          soft: '#314865',
          accent: '#C9A56A',
        },
        // ── Status ──
        success: { DEFAULT: '#38C98D', light: '#173E2F', text: '#38C98D' },
        error:   { DEFAULT: '#F36E7F', light: '#441F28', text: '#F36E7F' },
        warning: { DEFAULT: '#E1B15C', light: '#3E3119', text: '#E1B15C' },
        info:    { DEFAULT: '#69A8FF', light: '#1B3154', text: '#69A8FF' },
        // ── Utility ──
        input: {
          DEFAULT: '#132033',
          hover: '#17263B',
          focus: '#182A41',
        },
        chip: '#203149',
        tooltip: '#1B283A',
        overlay: 'rgba(2, 8, 20, 0.55)',
        // ── Legacy compat tokens ──
        navy: { DEFAULT: '#0B1220', light: '#111A2B' },
        steel: { DEFAULT: '#8697AD', light: '#B7C4D6' },
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
        'card': '0 1px 4px rgba(2, 8, 20, 0.3), 0 1px 2px rgba(2, 8, 20, 0.2)',
        'card-hover': '0 8px 24px rgba(2, 8, 20, 0.4), 0 2px 6px rgba(2, 8, 20, 0.25)',
        'panel': '0 2px 12px rgba(2, 8, 20, 0.35)',
        'dropdown': '0 12px 36px rgba(2, 8, 20, 0.5), 0 4px 12px rgba(2, 8, 20, 0.3)',
        'button': '0 1px 3px rgba(2, 8, 20, 0.25)',
        'focus': '0 0 0 3px rgba(46, 197, 182, 0.25)',
        'gold': '0 4px 14px rgba(201, 165, 106, 0.2)',
        'glow': '0 0 20px rgba(46, 197, 182, 0.15)',
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
