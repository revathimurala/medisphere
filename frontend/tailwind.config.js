/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        clinical: {
          critical: "#dc2626",
          warning: "#f59e0b",
          success: "#10b981",
          info: "#2563eb",
          purple: "#7c3aed",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'glow-brand': '0 0 15px rgba(2, 132, 199, 0.35)',
        'glow-critical': '0 0 18px rgba(220, 38, 38, 0.35)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'cardiac-pulse': 'cardiacPulse 1s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(2, 132, 199, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(2, 132, 199, 0)' },
        },
        cardiacPulse: {
          '0%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.28)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.18)' },
          '60%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
