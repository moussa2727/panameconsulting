/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
        },
      },

    },
  },
  plugins: [],
}