/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#F0F2F5',
        surface: '#FFFFFF',
        hi:      '#E8ECF2',
        border:  '#D1D9E6',
        amber:   '#E8920A',
        gold:    '#D4A017',
        green:   '#16A34A',
        blue:    '#2563EB',
        orange:  '#EA6C00',
        red:     '#DC2626',
        pink:    '#E11D48',
        muted:   '#94A3B8',
        sub:     '#64748B',
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
