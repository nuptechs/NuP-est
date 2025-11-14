import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Base Vite configuration for NuP apps
 * Works both standalone and in monorepo
 */
export function defineNupAppConfig(customConfig = {}) {
  return defineConfig({
    ...customConfig,
    
    plugins: [
      react(),
      ...(customConfig.plugins || [])
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './client/src'),
        '@shared': path.resolve(process.cwd(), './shared'),
        ...(customConfig.resolve?.alias || {})
      }
    },
    
    server: {
      host: '0.0.0.0',
      port: customConfig.server?.port || 5000,
      strictPort: false,
      ...(customConfig.server || {})
    },
    
    build: {
      outDir: 'dist/public',
      emptyOutDir: true,
      ...(customConfig.build || {})
    },
    
    optimizeDeps: {
      include: ['react', 'react-dom'],
      ...(customConfig.optimizeDeps || {})
    }
  });
}

export default defineNupAppConfig;
