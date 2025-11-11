import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { registerRoutes } from "../apps/nup-study/server/routes";
import { setupVite, serveStatic, log } from "../apps/nup-study/server/vite";

import '../apps/nup-study/server/services/large-document-processing/BackgroundWorker';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('🔧 [Proxy] Configurando proxy para NuP-Identify em /nup-identify -> http://localhost:5002');
  
  // Reverse Proxy Configuration for NuP Ecosystem Apps (MUST be before registerRoutes)
  app.use('/nup-identify', (req, res, next) => {
    console.log(`🔵 [ProxyDebug] Intercepted: ${req.method} ${req.url} (original: ${req.originalUrl})`);
    next();
  }, createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    ws: true,
    // Remove /nup-identify prefix before forwarding to backend
    pathRewrite: { '^/nup-identify': '' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🟢 [Proxy] NuP-Identify: ${req.method} ${req.url} -> ${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`🟡 [ProxyRes] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
      proxyRes.headers['x-proxied-by'] = 'NuP-Study';
    },
    onError: (err, req, res) => {
      console.log(`🔴 [Proxy Error] NuP-Identify: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'NuP-Identify não está disponível',
          message: 'Verifique se o serviço está rodando na porta 5002'
        });
      }
    }
  }));
  
  console.log('✅ [Proxy] NuP-Identify configurado com sucesso');

  console.log('🔧 [Proxy] Configurando proxy para NuP-AIM em /nup-aim -> http://localhost:34735');
  
  app.use('/nup-aim', createProxyMiddleware({
    target: 'http://localhost:34735',
    changeOrigin: true,
    ws: true,
    // Remove /nup-aim prefix before forwarding to backend
    pathRewrite: { '^/nup-aim': '' },
    onProxyReq: (proxyReq, req, res) => {
      log(`[Proxy] NuP-AIM: ${req.method} ${req.url} -> ${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['x-proxied-by'] = 'NuP-Study';
    },
    onError: (err, req, res) => {
      log(`[Proxy Error] NuP-AIM: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'NuP-AIM não está disponível',
          message: 'Verifique se o serviço está rodando na porta 34735'
        });
      }
    }
  }));
  
  console.log('✅ [Proxy] NuP-AIM configurado com sucesso');

  const server = await registerRoutes(app);

  const { errorMiddleware } = await import("../apps/nup-study/server/middleware/errorMiddleware");
  app.use(errorMiddleware);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
