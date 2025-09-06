import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isGameMode = process.env.VITE_APP_MODE === 'game'

export default defineConfig({
  plugins: [react()],
  root: isGameMode ? 'src/game' : 'src/dev',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@lib': resolve(__dirname, './src/lib'),
      '@dev': resolve(__dirname, './src/dev')
    }
  },
  build: {
    outDir: resolve(__dirname, isGameMode ? 'dist-game' : 'dist-dev'),
    emptyOutDir: true
  },
  server: {
    port: isGameMode ? 3001 : 3000,
    host: '0.0.0.0'
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})