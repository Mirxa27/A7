/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        jetbrains: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        tactical: {
          black: '#020617',
          green: '#10b981',
          'green-glow': '#34d399',
          slate: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
