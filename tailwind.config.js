/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        laser: {
          '0%, 100%': { top: '5%' },
          '50%': { top: '95%' }
        }
      },
      animation: {
        laser: 'laser 2s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}
