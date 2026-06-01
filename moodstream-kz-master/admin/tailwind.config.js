/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#D4D1CA',
        surface: '#141416',
        'surface-2': '#202024',
        'border-default': '#1C1C1F',
      }
    }
  },
  plugins: []
}
