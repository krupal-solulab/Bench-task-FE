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
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/', 'src/components/ui/', '**/*.d.ts', 'src/main.tsx'],
      // Raised progressively through the build phases; Phase 6 ("Fill test coverage") targets 60%+.
      thresholds: {
        lines: 15,
        functions: 30,
        branches: 50,
        statements: 15,
      },
    },
  },
})
