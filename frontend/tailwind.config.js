/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm-neutral canvas instead of pure gray — feels less clinical.
        canvas: '#f7f7f8',
        surface: '#ffffff',
        ink: {
          DEFAULT: '#1c1b22',
          muted: '#6b6a76',
          subtle: '#9d9ca8',
        },
        line: '#ecebef',
        brand: {
          50: '#eef1ff',
          100: '#e0e5ff',
          200: '#c7cfff',
          300: '#a5afff',
          400: '#8189fb',
          500: '#6366f1',
          600: '#5145e5',
          700: '#4436c9',
          800: '#3830a2',
          900: '#332f80',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(24 23 34 / 0.04), 0 1px 3px 0 rgb(24 23 34 / 0.06)',
        soft: '0 4px 16px -4px rgb(24 23 34 / 0.10)',
        pop: '0 12px 32px -8px rgb(24 23 34 / 0.18)',
        brand: '0 8px 24px -6px rgb(99 102 241 / 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
