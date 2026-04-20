import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core radical dark mode using strict Resend vibes
        slate: {
          1: '#111110', // App background
          2: '#191918', // Surface background
          3: '#222221', // Surface hover
          4: '#2a2a28', // Borders default
          5: '#31312e', // Borders hover
          6: '#3b3a37', // Borders strong
          7: '#53534e', // Muted text
          8: '#706e67', // Secondary text
          9: '#ededec', // Primary text
          10: '#ffffff', // High contrast
        },
        primary: {
          DEFAULT: '#ededec',
          inverse: '#111110',
          hover: '#ffffff',
          foreground: '#111110',
        },
        surface: {
          DEFAULT: '#111110',
          elevated: '#191918',
        },
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', 'sans-serif'],
        mono: ['SF Mono', 'var(--font-mono)', 'monospace'],
        serif: ['var(--font-serif)', 'serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.2)',
        elevated: '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        popover: '0 16px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
