import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isGameMode = process.env.VITE_APP_MODE === 'game'

export default defineConfig({
  plugins: [react()],
  root: isGameMode ? 'src/game' : 'src/dev',
  // Custom domain uses '/', github.io subdomain would use '/continuum/'
  // Since we're using continuumjs.com, we always use '/'
  base: '/',
  resolve: {
    alias: {
      // Longest prefix first: these are matched as plain string prefixes,
      // so '@render' would otherwise swallow '@render-modern'
      '@core': resolve(__dirname, './src/core'),
      '@game': resolve(__dirname, './src/game'),
      '@lib': resolve(__dirname, './src/lib'),
      '@dev': resolve(__dirname, './src/dev'),
      '@render-modern': resolve(__dirname, './src/render-modern'),
      '@render': resolve(__dirname, './src/render'),
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2022',
    outDir: resolve(__dirname, isGameMode ? 'dist-game' : 'dist-dev'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
