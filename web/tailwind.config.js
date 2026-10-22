/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#06b6d4', // cyan-500
          light: '#22d3ee',   // cyan-400
          dark: '#0891b2',    // cyan-600
          subtle: 'rgba(6, 182, 212, 0.1)',
        },
        surface: {
          base: '#09090b',    // zinc-950
          card: '#121215',    // elevated card
          overlay: '#18181b', // elevated dialog/dropdown
          border: '#27272a',  // subtle border (zinc-800)
          borderSubtle: '#1f1f23',
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.15)',
        'glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.15)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.15)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
