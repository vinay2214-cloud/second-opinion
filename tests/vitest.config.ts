import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // macOS stores metadata beside files on the external development volume.
    exclude: [...configDefaults.exclude, '**/._*'],
  },
});
