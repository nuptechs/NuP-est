import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// PDF worker não é mais necessário com newEditalService

// Import background worker for large document processing (auto-starts)
import './services/large-document-processing/BackgroundWorker';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
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
  // Mount at /nup-identify to match all paths starting with it
  app.use('/nup-identify', createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    ws: true,
    // DO NOT use pathRewrite - we need to preserve the /nup-identify prefix
    // so the target server knows its BASE_PREFIX
    router: (req) => {
      // Keep the full original path including /nup-identify
      req.url = req.originalUrl;
      return 'http://localhost:5002';
    },
    onProxyReq: (proxyReq, req, res) => {
      log(`[Proxy] NuP-Identify: ${req.method} ${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['x-proxied-by'] = 'NuP-Study';
    },
    onError: (err, req, res) => {
      log(`[Proxy Error] NuP-Identify: ${err.message}`);
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
  
  // Mount at /nup-aim to match all paths starting with it
  app.use('/nup-aim', createProxyMiddleware({
    target: 'http://localhost:34735',
    changeOrigin: true,
    ws: true,
    // DO NOT use pathRewrite - we need to preserve the /nup-aim prefix
    // so the target server knows its BASE_PREFIX
    router: (req) => {
      // Keep the full original path including /nup-aim
      req.url = req.originalUrl;
      return 'http://localhost:34735';
    },
    onProxyReq: (proxyReq, req, res) => {
      log(`[Proxy] NuP-AIM: ${req.method} ${req.url}`);
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

  // Sistema de tratamento de erro centralizado
  const { errorMiddleware } = await import("./middleware/errorMiddleware");
  app.use(errorMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
