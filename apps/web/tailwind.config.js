/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        hub: {
          purple: '#5D5FEF',
          'purple-hover': '#4B4DDB',
          'purple-light': '#EEF0FD',
          bg: '#F4F7FE',
          dark: '#1B254B',
          text: '#2B3674',
          gray: '#A3AED0',
          amber: '#FFB547',
          mint: '#05CD99',
          rose: '#EE5D50',
          cyan: '#01B574'
        },
      },
      boxShadow: {
        'hub-card': '0px 18px 40px rgba(112, 144, 176, 0.08)',
        'hub-soft': '0px 6px 20px rgba(112, 144, 176, 0.06)',
        'hub-glow': '0px 10px 25px rgba(93, 95, 239, 0.35)',
      },
    },
  },
  plugins: [],
}
