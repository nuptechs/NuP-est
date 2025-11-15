import { defineNupAppConfig } from "@nup/app-kit/vite";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
import path from "path";

export default defineNupAppConfig({
  server: {
    port: 5003,
  },
  plugins: [
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
      "@nup/ui": path.resolve(import.meta.dirname, "../../packages/@nup/ui/src/index.ts"),
      "@nup/api-client": path.resolve(import.meta.dirname, "../../packages/@nup/api-client/src/index.ts"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: process.env.BASE_PREFIX || '/',
  define: {
    'import.meta.env.VITE_BASE_PREFIX': JSON.stringify(process.env.BASE_PREFIX || '/'),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
  },
});