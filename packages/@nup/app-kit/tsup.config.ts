import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'shims/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'vite', 'tailwindcss'],
});
