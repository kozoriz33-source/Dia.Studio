/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#EEF0F4',
        card: '#FFFFFF',
        ink: '#0F1115',
        ink2: '#5D6371',
        ink3: '#9AA0AC',
        line: '#E4E7EC',
        soft: '#F4F5F8',
        accent: '#2F5BFF',
        accentSoft: '#E8EDFF',
        ok: '#12A150',
        okSoft: '#E3F6EB',
        warn: '#FF6B00',
        warnSoft: '#FFF0E5',
      },
      fontFamily: {
        display: ['Unbounded', 'Onest', 'system-ui', 'sans-serif'],
        sans: ['Onest', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,17,21,.04), 0 8px 24px -12px rgba(15,17,21,.12)',
        float: '0 12px 28px -8px rgba(15,17,21,.45)',
        sheet: '0 -12px 40px -10px rgba(15,17,21,.25)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        sheet: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        rise: 'rise .4s cubic-bezier(.2,.8,.2,1) both',
        fade: 'fade .2s ease-out both',
        sheet: 'sheet .34s cubic-bezier(.2,.9,.3,1) both',
        pop: 'pop .25s cubic-bezier(.2,.9,.3,1.2) both',
      },
    },
  },
  plugins: [],
}
