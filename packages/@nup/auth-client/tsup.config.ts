import { defineConfig } from 'tsup';

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
    '@nup/shared-types',
  ],
  outDir: 'dist',
  skipNodeModulesBundle: true,
});
