/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`;

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: { DEFAULT: v('c-page'), subtle: v('c-page-subtle') },
        surface: { DEFAULT: v('c-surface'), raised: v('c-surface-raised') },
        line: { DEFAULT: v('c-line'), strong: v('c-line-strong') },
        fg: {
          DEFAULT: v('c-fg'),
          secondary: v('c-fg-secondary'),
          tertiary: v('c-fg-tertiary'),
          inverse: v('c-fg-inverse'),
        },
        accent: {
          DEFAULT: v('c-accent'),
          hover: v('c-accent-hover'),
          pressed: v('c-accent-pressed'),
          subtle: v('c-accent-subtle'),
        },
        success: { DEFAULT: v('c-success'), subtle: v('c-success-subtle') },
        warning: { DEFAULT: v('c-warning'), subtle: v('c-warning-subtle') },
        danger: { DEFAULT: v('c-danger'), subtle: v('c-danger-subtle') },
        info: { DEFAULT: v('c-info'), subtle: v('c-info-subtle') },
        gold: { DEFAULT: v('c-gold'), subtle: v('c-gold-subtle') },
        tile: v('c-tile'),
      },
      fontFamily: {
        serif: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        full: '9999px',
      },
      boxShadow: {
        e1: '0 1px 2px rgba(35,29,24,.06)',
        e2: '0 4px 12px rgba(35,29,24,.10)',
        e3: '0 12px 32px rgba(35,29,24,.16)',
      },
      maxWidth: {
        content: '1104px',
        reading: '600px',
      },
      transitionTimingFunction: {
        brand: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.5' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        pulseRing: 'pulseRing 1.8s cubic-bezier(0.2,0,0,1) infinite',
      },
    },
  },
  plugins: [],
};
