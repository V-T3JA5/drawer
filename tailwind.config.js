/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: '#8B0000',
          bright: '#C0002A',
          glow: '#FF1744',
        },
        navy: {
          DEFAULT: '#050810',
          mid: '#0A0F1E',
          light: '#111827',
        },
      },
      fontFamily: {
        // Placeholder — fonts decided in S3
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
