import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: {
      // Expose describe/it/etc. globally without importing
    },
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
});
