import { defineConfig } from 'tsup';
import { cp } from 'fs/promises';
import { join } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['@sendgrid/mail'],
  outDir: 'dist',
  async onSuccess() {
    // Copy email templates
    try {
      await cp(join('src', 'templates'), join('dist', 'templates'), { recursive: true });
      console.log('✅ Copied email templates to dist');
    } catch (err) {
      console.warn('⚠️ Could not copy templates:', err);
    }
  },
});
