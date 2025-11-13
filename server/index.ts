import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

const NUP_STUDY_TARGET = process.env.NUP_STUDY_TARGET || 'http://localhost:5001';
const NUP_IDENTIFY_TARGET = process.env.NUP_IDENTIFY_TARGET || 'http://localhost:5002';
const NUP_AIM_TARGET = process.env.NUP_AIM_TARGET || 'http://localhost:34735';

console.log('🌐 [Gateway] Inicializando gateway NuP...\n');

function createProxyConfig(
  name: string,
  target: string,
  pathPrefix?: string
): Options {
  return {
    target,
    changeOrigin: true,
    ws: true,
    pathRewrite: pathPrefix ? (path: string) => {
      if (path.startsWith('/api')) {
        return path;
      }
      return `${pathPrefix}${path}`;
    } : undefined,
    onProxyRes: (proxyRes: any, req: any, res: any) => {
      proxyRes.headers['x-proxied-by'] = 'NuP-Gateway';
    },
    onError: (err: any, req: any, res: any) => {
      console.log(`🔴 [Gateway] ${name} proxy error: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: `${name} não está disponível`,
          message: 'Verifique se o serviço está rodando',
          service: name
        });
      }
    }
  };
}

console.log(`🔧 [Gateway] Configurando proxy NuP-Identify → ${NUP_IDENTIFY_TARGET}`);
app.use('/nup-identify', createProxyMiddleware(
  createProxyConfig('NuP-Identify', NUP_IDENTIFY_TARGET, '/nup-identify')
));

console.log(`🔧 [Gateway] Configurando proxy NuP-AIM → ${NUP_AIM_TARGET}`);
app.use('/nup-aim', createProxyMiddleware(
  createProxyConfig('NuP-AIM', NUP_AIM_TARGET, '/nup-aim')
));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

app.get('/health', async (req: Request, res: Response) => {
  const services = {
    gateway: { status: 'healthy', timestamp: new Date().toISOString() },
    'nup-study': { status: 'unknown', target: NUP_STUDY_TARGET },
    'nup-identify': { status: 'unknown', target: NUP_IDENTIFY_TARGET },
    'nup-aim': { status: 'unknown', target: NUP_AIM_TARGET }
  };

  const checkService = async (name: string, url: string) => {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
      services[name as keyof typeof services].status = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      services[name as keyof typeof services].status = 'unavailable';
    }
  };

  await Promise.all([
    checkService('nup-study', NUP_STUDY_TARGET),
    checkService('nup-identify', NUP_IDENTIFY_TARGET),
    checkService('nup-aim', NUP_AIM_TARGET)
  ]);

  const allHealthy = Object.values(services).every(s => s.status === 'healthy' || s.status === 'unknown');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

console.log(`🔧 [Gateway] Configurando proxy NuP-Study (API) → ${NUP_STUDY_TARGET}`);

app.use(['/api', '/socket.io'], createProxyMiddleware(
  createProxyConfig('NuP-Study-API', NUP_STUDY_TARGET)
));

if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist', 'public');
  
  console.log(`📦 [Gateway] Servindo assets estáticos de: ${distPath}`);
  
  app.use(express.static(distPath));
  
  app.get('*', (req: Request, res: Response) => {
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ [Gateway] Erro ao servir index.html:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  });
  
  console.log('✅ [Gateway] Modo produção - assets estáticos + proxy API');
} else {
  console.log(`🔧 [Gateway] Configurando proxy NuP-Study (frontend) → ${NUP_STUDY_TARGET}`);
  
  app.use('/', createProxyMiddleware(
    createProxyConfig('NuP-Study-Frontend', NUP_STUDY_TARGET)
  ));
  
  console.log('✅ [Gateway] Modo desenvolvimento - proxy completo para NuP-Study');
}

server.listen(PORT, "0.0.0.0", () => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🌐 NuP Gateway - Monorepo Reverse Proxy               ║');
  console.log('║                                                           ║');
  console.log(`║   Servidor rodando em: http://localhost:${PORT}           ║`);
  console.log(`║   Ambiente: ${NODE_ENV.padEnd(44)}║`);
  console.log('║                                                           ║');
  console.log('║   Rotas:                                                  ║');
  console.log(`║   • /              → NuP-Study    (${NUP_STUDY_TARGET.padEnd(18)}) ║`);
  console.log(`║   • /nup-identify  → NuP-Identify (${NUP_IDENTIFY_TARGET.padEnd(18)}) ║`);
  console.log(`║   • /nup-aim       → NuP-AIM      (${NUP_AIM_TARGET.padEnd(18)}) ║`);
  console.log('║   • /health        → Health Check                         ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
});
