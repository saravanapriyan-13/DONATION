/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './*.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#09090B',
          50: '#27272A',
          100: '#18181B',
          200: '#121215',
          300: '#09090B',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        teal: {
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'emerald-glow': '0 0 25px rgba(16, 185, 129, 0.35)',
        'emerald-500/5': '0 12px 30px -5px rgba(16, 185, 129, 0.07)',
        'emerald-600/25': '0 10px 25px -3px rgba(5, 150, 105, 0.28)',
      },
      letterSpacing: {
        tight: '-0.03em',
        tighter: '-0.05em',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'upload-pulse': 'uploadPulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideInUp 0.45s ease-out forwards',
      },
      keyframes: {
        uploadPulse: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.45)' },
          '50%': { transform: 'scale(1.06)', boxShadow: '0 0 0 16px rgba(16, 185, 129, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        }
      }
    },
  },
  plugins: [],
};
