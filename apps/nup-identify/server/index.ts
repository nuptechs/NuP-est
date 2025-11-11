import express, { type Express } from "express";
import session from "express-session";
import { createServer } from "http";
import { config } from "./config";
import { setupVite, serveStatic } from "./vite";

// Routes
import { registerRoutes } from "./routes";

const app: Express = express();
const server = createServer(app);

// =============================================================================
// MIDDLEWARE
// =============================================================================

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (para OAuth flows)
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  },
}));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging (development)
if (config.nodeEnv === "development") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// =============================================================================
// API ROUTES
// =============================================================================

registerRoutes(app);

// =============================================================================
// FRONTEND (Vite Dev Server or Static Files)
// =============================================================================

if (config.nodeEnv === "development") {
  // Development: Setup Vite dev server
  setupVite(app, server);
} else {
  // Production: Serve static files
  serveStatic(app);
}

// =============================================================================
// START SERVER
// =============================================================================

const PORT = config.port;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔐 NuPIdentity - Central de Identidade NuPtechs       ║
║                                                           ║
║   Servidor rodando em: http://localhost:${PORT}           ║
║   Ambiente: ${config.nodeEnv.padEnd(43)}║
║   Frontend: ${config.nodeEnv === "development" ? "Vite Dev Server" : "Static Build".padEnd(38)}║
║                                                           ║
║   Authentication:                                         ║
║   • POST   /api/auth/register                             ║
║   • POST   /api/auth/login                                ║
║   • POST   /api/auth/refresh                              ║
║   • POST   /api/auth/logout                               ║
║   • GET    /api/auth/me                                   ║
║                                                           ║
║   Organizations & Teams:                                  ║
║   • GET    /api/organizations                             ║
║   • POST   /api/organizations                             ║
║   • GET    /api/teams                                     ║
║   • POST   /api/teams                                     ║
║                                                           ║
║   Invitations:                                            ║
║   • GET    /api/invitations                               ║
║   • POST   /api/invitations                               ║
║   • POST   /api/invitations/:token/accept                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
