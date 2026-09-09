import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    include: ['**/*.e2e-spec.ts'],
    root: './',
  },
});
