import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    root: '.', // Run tests from project root
    include: [
      'src/**/*.{test,spec}.{ts,tsx}' // Include all test files under src
    ]
  },
  resolve: {
    alias: {
      // Kept in step with vite.config.ts, longest prefix first
      '@core': resolve(__dirname, './src/core'),
      '@game': resolve(__dirname, './src/game'),
      '@lib': resolve(__dirname, './src/lib'),
      '@dev': resolve(__dirname, './src/dev'),
      '@render-modern': resolve(__dirname, './src/render-modern'),
      '@render': resolve(__dirname, './src/render'),
      '@': resolve(__dirname, './src')
    }
  }
})
