import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/api.ts',
        'src/lib/base.ts',
        'src/lib/football-types.ts',
        'src/lib/prefs.ts',
        'src/lib/types.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 60,
        functions: 90,
        lines: 90,
      },
    },
  },
});
