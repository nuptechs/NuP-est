import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const BASE_PREFIX = process.env.BASE_PREFIX || '';
  console.log(`🔧 [NuP-AIM] Initializing on port ${PORT}...`);
  if (BASE_PREFIX) console.log(`🔧 [NuP-AIM] Base prefix: ${BASE_PREFIX}`);
  
  try {
    process.env.COMPOSED_DEV = '1';
    
    console.log('📦 [NuP-AIM] Loading API...');
    const module = await import('./index.js');
    const apiApp = module.default;
    console.log('✅ [NuP-AIM] API loaded');
    
    const app = express();
    const server = createHttpServer(app);
    app.use(apiApp);
    
    console.log('⚡ [NuP-AIM] Setting up Vite...');
    const vite = await createViteServer({
      server: { 
        middlewareMode: {
          server: server
        },
        hmr: {
          server: server,
          path: BASE_PREFIX ? `${BASE_PREFIX}/__vite_hmr` : '/__vite_hmr'
        },
        host: '0.0.0.0'
      },
      base: BASE_PREFIX || '/',
      appType: 'custom',
      root: path.resolve(__dirname, '..'),
      preview: {
        host: '0.0.0.0',
        strictPort: false
      }
    });
    app.use(vite.middlewares);
    console.log('✅ [NuP-AIM] Vite ready');
    
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) return next();
      
      try {
        const originalUrl = req.originalUrl;
        let url = originalUrl;
        
        if (BASE_PREFIX && url.startsWith(BASE_PREFIX)) {
          url = url.slice(BASE_PREFIX.length) || '/';
        }
        
        // Load and transform the HTML template
        let template = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'index.html'), 'utf-8');
        
        // Transform HTML with Vite (WITHOUT modifying template first)
        let html = await vite.transformIndexHtml(url, template);
        
        // If we have a base prefix, manually prepend it to all Vite-generated paths
        if (BASE_PREFIX) {
          html = html
            // Fix Vite client and HMR paths
            .replaceAll('"/@vite/', `"${BASE_PREFIX}/@vite/`)
            .replaceAll("'/@vite/", `'${BASE_PREFIX}/@vite/`)
            .replaceAll('from "/@vite/', `from "${BASE_PREFIX}/@vite/`)
            .replaceAll("from '/@vite/", `from '${BASE_PREFIX}/@vite/`)
            // Fix React Refresh paths
            .replaceAll('"/@react-refresh"', `"${BASE_PREFIX}/@react-refresh"`)
            .replaceAll("'/@react-refresh'", `'${BASE_PREFIX}/@react-refresh'`)
            .replaceAll('from "/@react-refresh"', `from "${BASE_PREFIX}/@react-refresh"`)
            .replaceAll("from '/@react-refresh'", `from '${BASE_PREFIX}/@react-refresh'`)
            // Fix source paths
            .replace(/src="\/src\//g, `src="${BASE_PREFIX}/src/`)
            .replace(/href="\/src\//g, `href="${BASE_PREFIX}/src/`)
            .replace(/from "\/src\//g, `from "${BASE_PREFIX}/src/`)
            .replace(/from '\/src\//g, `from '${BASE_PREFIX}/src/`)
            // Fix @fs paths
            .replace(/from "\/@fs\//g, `from "${BASE_PREFIX}/@fs/`)
            .replace(/from '\/@fs\//g, `from '${BASE_PREFIX}/@fs/`);
        }
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
    
    console.log(`🎯 [NuP-AIM] Starting on 0.0.0.0:${PORT}...`);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [NuP-AIM] READY → http://0.0.0.0:${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ [NuP-AIM] Fatal:', error);
    process.exit(1);
  }
}

main();
