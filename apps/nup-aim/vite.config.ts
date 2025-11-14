import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client/src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  base: process.env.BASE_PREFIX || '/',
  define: {
    'import.meta.env.VITE_BASE_PREFIX': JSON.stringify(process.env.BASE_PREFIX || '/'),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  envPrefix: 'VITE_',
  server: {
    host: '0.0.0.0',
    port: 5003,
    strictPort: true,
    hmr: {
      path: (process.env.BASE_PREFIX || '') + '/__vite_hmr',
    },
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
});