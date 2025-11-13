import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, 'client'),
  base: process.env.BASE_PREFIX || '/',
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
  // Force environment variables to be loaded
  envPrefix: 'VITE_',
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5003'),
    strictPort: true,
    allowedHosts: true,
    hmr: {
      path: (process.env.BASE_PREFIX || '') + '/__vite_hmr',
    },
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || '8080'}`,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: `http://localhost:${process.env.API_PORT || '8080'}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});