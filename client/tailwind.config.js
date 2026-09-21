/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#10131a',
        'surface-dim': '#10131a',
        'surface-container-lowest': '#0b0e14',
        'surface-container-low': '#191c22',
        'surface-container': '#1d2026',
        'surface-container-high': '#272a31',
        'surface-container-highest': '#32353c',
        'on-surface': '#e0e2eb',
        'on-surface-variant': '#c3c6d7',
        'primary-container': '#2563eb',
        'secondary-container': '#3626ce',
        'tertiary-container': '#007d55',
        'tertiary': '#4edea3',
        glass: {
          dark: 'rgba(255,255,255,0.04)',
          light: 'rgba(255,255,255,0.80)',
          hoverDark: 'rgba(255,255,255,0.06)',
          hoverLight: 'rgba(255,255,255,0.08)',
        },
        dark: {
          950: '#07090e',
          900: '#0b0e14',
          850: '#11151f',
          800: '#161c28',
          750: '#1c2333',
          700: '#222b3d',
          600: '#2e3a52',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          cyan: '#06b6d4',
          purple: '#a855f7',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.5)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.5)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.5)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
