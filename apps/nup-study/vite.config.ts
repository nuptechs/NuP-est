import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@nup/ui": path.resolve(import.meta.dirname, "../../packages/@nup/ui/src/index.ts"),
      "@nup/auth-client": path.resolve(import.meta.dirname, "../../packages/@nup/auth-client/src/index.ts"),
      "@nup/api-client": path.resolve(import.meta.dirname, "../../packages/@nup/api-client/src/index.ts"),
      "@nup/shared-types": path.resolve(import.meta.dirname, "../../packages/@nup/shared-types/src/index.ts"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: process.env.BASE_PREFIX || '/',
  define: {
    'import.meta.env.VITE_BASE_PREFIX': JSON.stringify(process.env.BASE_PREFIX || '/'),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5001,
    strictPort: true,
    hmr: {
      path: (process.env.BASE_PREFIX || '') + '/__vite_hmr',
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
