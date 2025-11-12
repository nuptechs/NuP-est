import express, { type Express, type Request, type Response } from "express";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";

const app: Express = express();
const PORT = process.env.PORT || 5000;

// =============================================================================
// CONFIGURATION
// =============================================================================

interface ServiceConfig {
  name: string;
  target: string;
  pathPrefix: string;
  healthCheck?: string;
}

const services: ServiceConfig[] = [
  {
    name: "NuP-Study",
    target: process.env.NUP_STUDY_URL || "http://localhost:5001",
    pathPrefix: "/",
    healthCheck: "/api/health",
  },
  {
    name: "NuP-Identify",
    target: process.env.NUP_IDENTIFY_URL || "http://localhost:5002",
    pathPrefix: "/nup-identify",
    healthCheck: "/api/health",
  },
  {
    name: "NuP-AIM",
    target: process.env.NUP_AIM_URL || "http://localhost:5003",
    pathPrefix: "/nup-aim",
    healthCheck: "/api/health",
  },
];

// =============================================================================
// HEALTH CHECKS
// =============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    gateway: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/services", async (_req: Request, res: Response) => {
  const checks = await Promise.all(
    services.map(async (service) => {
      try {
        const url = `${service.target}${service.healthCheck || "/health"}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        return {
          name: service.name,
          status: response.ok ? "healthy" : "unhealthy",
          statusCode: response.status,
        };
      } catch (error) {
        return {
          name: service.name,
          status: "unreachable",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  const allHealthy = checks.every((check) => check.status === "healthy");
  res.status(allHealthy ? 200 : 503).json({
    gateway: "running",
    services: checks,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// PROXY CONFIGURATION
// =============================================================================

const createProxyConfig = (service: ServiceConfig): Options => ({
  target: service.target,
  changeOrigin: true,
  ws: true,
  pathRewrite:
    service.pathPrefix !== "/"
      ? { [`^${service.pathPrefix}`]: "" }
      : undefined,
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader("X-Forwarded-Host", req.headers.host || "");
    proxyReq.setHeader("X-Forwarded-Proto", req.protocol);
    proxyReq.setHeader("X-Forwarded-For", req.ip || req.socket.remoteAddress || "");
    proxyReq.setHeader("X-Original-URI", req.originalUrl);
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[Gateway] Proxying: ${req.method} ${req.path} -> ${service.target}`);
    }
  },
  onError: (err, req, res) => {
    console.error(`[Gateway] Proxy error for ${service.name}:`, err.message);
    
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "Bad Gateway",
        service: service.name,
        message: `Service ${service.name} is unavailable`,
        timestamp: new Date().toISOString(),
      }));
    }
  },
  logLevel: process.env.NODE_ENV === "development" ? "debug" : "warn",
});

// =============================================================================
// REGISTER PROXIES
// =============================================================================

// Sort services by pathPrefix length (longest first) to avoid routing conflicts
const sortedServices = [...services].sort(
  (a, b) => b.pathPrefix.length - a.pathPrefix.length
);

for (const service of sortedServices) {
  const proxyMiddleware = createProxyMiddleware(createProxyConfig(service));
  
  if (service.pathPrefix === "/") {
    // Root path - catch all remaining routes
    app.use(proxyMiddleware);
  } else {
    // Specific path prefix
    app.use(service.pathPrefix, proxyMiddleware);
  }
  
  console.log(`✅ [Gateway] Configured proxy: ${service.pathPrefix} -> ${service.target}`);
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌐 NuPtechs Gateway - Multi-Repl Architecture          ║
║                                                           ║
║   Gateway running on: http://0.0.0.0:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || "development"}                                  ║
║                                                           ║
║   Proxied Services:                                       ║
${services
  .map(
    (s) =>
      `║   • ${s.name.padEnd(20)} ${s.pathPrefix.padEnd(20)} → ${s.target.substring(0, 20)}║`
  )
  .join("\n")}
║                                                           ║
║   Health Checks:                                          ║
║   • GET  /health              - Gateway status            ║
║   • GET  /health/services     - All services status       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
