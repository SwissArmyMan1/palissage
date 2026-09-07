/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: { DEFAULT: v('c-page'), subtle: v('c-page-subtle') },
        surface: { DEFAULT: v('c-surface'), raised: v('c-surface-raised') },
        line: { DEFAULT: v('c-line'), strong: v('c-line-strong') },
        fg: { DEFAULT: v('c-fg'), secondary: v('c-fg-secondary'), inverse: v('c-fg-inverse') },
        accent: {
          DEFAULT: v('c-accent'),
          hover: v('c-accent-hover'),
          pressed: v('c-accent-pressed'),
          subtle: v('c-accent-subtle'),
        },
        vine: v('c-vine'),
        success: { DEFAULT: v('c-success'), subtle: v('c-success-subtle') },
        warning: { DEFAULT: v('c-warning'), subtle: v('c-warning-subtle') },
        danger: { DEFAULT: v('c-danger'), subtle: v('c-danger-subtle') },
        info: { DEFAULT: v('c-info'), subtle: v('c-info-subtle') },
      },
      fontFamily: {
        serif: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      spacing: { 18: '4.5rem', 30: '7.5rem' },
      borderRadius: { DEFAULT: '8px', panel: '16px', hero: '20px' },
      boxShadow: {
        hover: '0 8px 24px rgb(41 31 36 / 8%)',
        overlay: '0 24px 64px rgb(41 31 36 / 18%)',
      },
      maxWidth: { public: '1280px', prose: '720px', form: '760px', dialog: '640px' },
      zIndex: { sticky: '10', header: '20', action: '25', dropdown: '30', overlay: '50', modal: '60', toast: '70' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      screens: { xl: '1200px', '2xl': '1440px' },
    },
  },
  plugins: [],
};
