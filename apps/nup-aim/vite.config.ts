import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@nup/ui': path.resolve(__dirname, '../../packages/@nup/ui/src'),
      '@nup/auth-client': path.resolve(__dirname, '../../packages/@nup/auth-client/src'),
      '@nup/api-client': path.resolve(__dirname, '../../packages/@nup/api-client/src'),
      '@nup/shared-types': path.resolve(__dirname, '../../packages/@nup/shared-types/src'),
    },
  },
  server: {
    port: 5003,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
});
