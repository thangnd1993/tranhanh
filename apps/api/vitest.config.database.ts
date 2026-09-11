import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['test/**/*.database-test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
