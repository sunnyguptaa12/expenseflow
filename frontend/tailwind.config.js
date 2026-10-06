/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#effaf7', 100: '#d3f3ea', 200: '#a8e6d6', 300: '#72d2bd', 400: '#3fb8a1', 500: '#1f9c88', 600: '#0f766e', 700: '#0d5f5a', 800: '#0e4c49', 900: '#0d3f3d' },
        ink: { 50: '#f4f6f3', 100: '#e7ebe6', 200: '#cfd6cd', 300: '#aab5a8', 400: '#7d8b7b', 500: '#5c6a5a', 600: '#46524a', 700: '#333d37', 800: '#1f2823', 900: '#141b17', 950: '#0c110e' },
      },
    },
  },
  plugins: [],
};
