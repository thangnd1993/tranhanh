import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    globals: true,
    include: ['**/*.e2e-spec.ts'],
    root: './',
  },
});
