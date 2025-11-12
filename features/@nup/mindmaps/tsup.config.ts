import { defineConfig } from 'tsup';
import { resolve } from 'path';

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
    '@xyflow/react',
    '@tanstack/react-query',
    'lucide-react',
  ],
  esbuildOptions(options) {
    options.alias = {
      '@nup/ui': resolve(__dirname, '../../../packages/@nup/ui/dist/index.js'),
      '@nup/api-client': resolve(__dirname, '../../../packages/@nup/api-client/dist/index.js'),
      '@nup/shared-types': resolve(__dirname, '../../../packages/@nup/shared-types/dist/index.js'),
    };
  },
  outDir: 'dist',
  skipNodeModulesBundle: true,
});
