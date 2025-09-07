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
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@lib': resolve(__dirname, './src/lib'),
      '@dev': resolve(__dirname, './src/dev')
    }
  }
})