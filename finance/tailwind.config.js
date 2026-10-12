/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0f14',
        panel: '#1b1d24',
        panel2: '#2a2d36',
        line: '#2a2d36',
        accent: '#02d2e3',
        warn: '#ff6b00',
        muted: '#b6c1c8',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px -8px rgba(0,0,0,.6)',
        glow: '0 0 24px -4px rgba(2,210,227,.45)',
        hero: '0 20px 40px -16px rgba(2,210,227,.55)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        sheet: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
      },
      animation: {
        rise: 'rise .45s ease-out both',
        fade: 'fade .2s ease-out both',
        sheet: 'sheet .32s cubic-bezier(.2,.9,.3,1) both',
      },
    },
  },
  plugins: [],
}
