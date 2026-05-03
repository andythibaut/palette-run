/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0B0E13',
        surface: '#13181F',
        hi:      '#1A2030',
        border:  '#1C2330',
        amber:   '#F5A623',
        gold:    '#FFD166',
        green:   '#2ECC71',
        blue:    '#3B82F6',
        orange:  '#F97316',
        red:     '#EF4444',
        pink:    '#F43F5E',
        muted:   '#4A5568',
        sub:     '#718096',
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        mono:  ['DM Mono', 'monospace'],
        bebas: ['Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
