import { defineConfig } from 'tsup';
import { cp } from 'fs/promises';
import { join } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      incremental: false,
    },
  },
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['@sendgrid/mail'],
  outDir: 'dist',
  skipNodeModulesBundle: true,
  async onSuccess() {
    try {
      await cp(join('src', 'templates'), join('dist', 'templates'), { recursive: true });
      console.log('✅ Copied email templates to dist');
    } catch (err) {
      // Templates folder might not exist
    }
  },
});
