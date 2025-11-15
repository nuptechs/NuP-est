import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'shims/index.ts', 'shims/ui.tsx', 'shims/api.ts'],
  format: ['esm'],
  dts: {
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  external: [
    'react',
    'react-dom',
    'vite',
    'tailwindcss',
    '@nup/ui',
    '@nup/api-client',
    '@babel/preset-typescript'
  ],
  noExternal: [],
  treeshake: true,
  splitting: false,
  skipNodeModulesBundle: true,
});
