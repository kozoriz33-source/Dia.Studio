import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' — приложение можно хостить в любой подпапке (например /finance/)
export default defineConfig({
  base: './',
  plugins: [react()],
})
