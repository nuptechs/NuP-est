import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: './',
  build: {
    outDir: '../dist',
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
    port: parseInt(process.env.VITE_PORT || '5173'),
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || '8080'}`,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: `http://localhost:${process.env.PORT || '8080'}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});