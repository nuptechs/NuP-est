import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
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
    host: true,
    port: 5173,
    proxy: {
      // Proxy API requests during development
      '/api/vision-ocr': {
        bypass: (req, res) => {
          // Serve the local API handler
          const apiModule = import.meta.glob('./src/api/vision-ocr.js');
          if (apiModule['./src/api/vision-ocr.js']) {
            apiModule['./src/api/vision-ocr.js']().then(module => {
              module.default(req, res);
            });
            return true;
          }
        }
      },
      '/api/extract-fields': {
        bypass: (req, res) => {
          // Serve the local API handler
          const apiModule = import.meta.glob('./src/api/extract-fields.js');
          if (apiModule['./src/api/extract-fields.js']) {
            apiModule['./src/api/extract-fields.js']().then(module => {
              module.default(req, res);
            });
            return true;
          }
        }
      }
    }
  }
});