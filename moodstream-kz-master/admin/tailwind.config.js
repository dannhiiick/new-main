/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#1DB954',
        surface: '#161616',
        'surface-2': '#1e1e1e',
        'border-default': '#2a2a2a',
      }
    }
  },
  plugins: []
}
