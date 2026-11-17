import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration: path aliases, specs under `tests/`, and v8 coverage.
 *
 * The entrypoint and the type-only folders (`constants/`, `interfaces/`, `types/`) are excluded from coverage because
 * they hold no branching logic; their behavior is exercised through the
 * service and tool seams.
 *
 * @example
 * ```bash
 * pnpm test
 * pnpm test:coverage
 * ```
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
      '@constants': path.join(root, 'src/constants'),
      '@interfaces': path.join(root, 'src/interfaces'),
      '@app-types': path.join(root, 'src/types'),
      '@services': path.join(root, 'src/services'),
      '@tools': path.join(root, 'src/tools'),
      '@utils': path.join(root, 'src/utils'),
      '@providers': path.join(root, 'src/providers'),
      '@tests': path.join(root, 'tests'),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/**/*.d.ts', 'src/index.ts', 'src/constants/**', 'src/interfaces/**', 'src/types/**'],
      thresholds: {
        statements: 90,
        lines: 90,
        branches: 80,
        functions: 90,
      },
    },
  },
});
