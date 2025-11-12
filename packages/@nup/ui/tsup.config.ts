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
  external: [
    'react',
    'react-dom',
    '@radix-ui/react-toast',
    'class-variance-authority',
    'clsx',
    'lucide-react',
    'tailwind-merge',
  ],
  outDir: 'dist',
  async onSuccess() {
    // Copy CSS styles if they exist
    try {
      await cp(join('src', 'styles'), join('dist', 'styles'), { recursive: true });
      console.log('✅ Copied styles to dist');
    } catch (err) {
      // Styles folder might not exist, that's OK
    }
  },
});
