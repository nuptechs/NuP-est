import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  console.log(`🔧 [NuP-AIM] Initializing on port ${PORT}...`);
  
  try {
    process.env.COMPOSED_DEV = '1';
    
    console.log('📦 [NuP-AIM] Loading API...');
    const module = await import('./index.js');
    const apiApp = module.default;
    console.log('✅ [NuP-AIM] API loaded');
    
    const app = express();
    app.use(apiApp);
    
    console.log('⚡ [NuP-AIM] Setting up Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      root: path.resolve(__dirname, '..')
    });
    app.use(vite.middlewares);
    console.log('✅ [NuP-AIM] Vite ready');
    
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) return next();
      
      try {
        const html = await vite.transformIndexHtml(
          req.originalUrl,
          fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8')
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
    
    console.log(`🎯 [NuP-AIM] Starting on 0.0.0.0:${PORT}...`);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [NuP-AIM] READY → http://0.0.0.0:${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ [NuP-AIM] Fatal:', error);
    process.exit(1);
  }
}

main();
