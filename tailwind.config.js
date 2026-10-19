/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background))', // Light gray background like Drive
        surface: 'rgb(var(--surface))',
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          hover: 'rgb(var(--primary-hover))',
          light: 'rgb(var(--primary-light))',
        },
        google: {
          blue: '#4285F4',
          red: '#ea4335',
          green: '#34a853',
          yellow: '#fbbc04',
          gray: '#5f6368',
          text: 'rgb(var(--content-text))',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'], // Body text
        heading: ['var(--font-outfit)', 'sans-serif'], // Headings
        outfit: ['var(--font-outfit)', 'sans-serif'], // Legacy support/specific use
      },
      boxShadow: {
        'drive': '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'drive-hover': '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
        'header': 'inset 0 -1px 0 0 #dadce0',
      }
    },
  },
  plugins: [],
}
