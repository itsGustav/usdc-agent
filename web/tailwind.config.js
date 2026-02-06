/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f8fafc',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#94a3b8', // muted
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1e293b', // card border
          900: '#111827', // card bg
          950: '#0a0a0f', // near-black with blue tint
        },
        // Blue trust theme (primary brand)
        blue: {
          400: '#60a5fa',
          500: '#3b82f6', // primary hover
          600: '#2563eb', // trust blue (primary)
          700: '#1d4ed8', // deep blue
          800: '#1e40af',
        },
        // Legacy orange (kept for backward compatibility, will be replaced)
        orange: {
          500: '#f97316',
          600: '#ea580c',
          950: '#431407',
        },
        // Lobster colors (now mapped to blue for brand consistency)
        lobster: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        green: {
          400: '#4ade80',
          500: '#22c55e',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(37, 99, 235, 0.15)',
        'glow-blue-lg': '0 0 30px rgba(37, 99, 235, 0.3)',
      }
    },
  },
  plugins: [],
}
