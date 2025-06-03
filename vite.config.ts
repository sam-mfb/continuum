import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/engine': resolve(__dirname, './src/engine'),
      '@/parsers': resolve(__dirname, './src/parsers'),
      '@/assets': resolve(__dirname, './src/assets')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
