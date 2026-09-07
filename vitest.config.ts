import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/components/ui/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx',
      ],
      // Raised progressively through the build phases; Phase 6 ("Fill test coverage") targets 60%+.
      thresholds: {
        lines: 25,
        functions: 20,
        branches: 25,
        statements: 25,
      },
    },
  },
})
