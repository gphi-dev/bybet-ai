/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'ai-',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
