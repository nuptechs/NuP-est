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
  skipNodeModulesBundle: true,
  async onSuccess() {
    try {
      await cp(join('src', 'styles'), join('dist', 'styles'), { recursive: true });
      console.log('✅ Copied styles to dist');
    } catch (err) {
      // Styles folder might not exist
    }
  },
});
