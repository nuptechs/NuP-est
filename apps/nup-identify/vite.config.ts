import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorModal(),
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
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: '/nup-identify/',
  server: {
    host: "0.0.0.0",
    port: 5001,
    strictPort: true,
    hmr: {
      path: '/nup-identify/__vite_hmr',
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
