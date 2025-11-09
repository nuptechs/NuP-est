import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createUnifiedServer() {
  try {
    console.log('🔧 [NuP-AIM] Starting unified server...');
    
    // Set environment flag BEFORE importing
    process.env.COMPOSED_DEV = '1';
    
    console.log('📦 [NuP-AIM] Importing API app...');
    const { default: apiApp } = await import('./index.js');
    console.log('✅ [NuP-AIM] API imported');
    
    const app = express();
    
    // Mount API routes
    app.use(apiApp);
    console.log('🛣️  [NuP-AIM] API mounted');
    
    // Create Vite server
    console.log('⚡ [NuP-AIM] Creating Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      root: path.resolve(__dirname, '..')
    });
    console.log('✅ [NuP-AIM] Vite created');
    
    // Use Vite middleware
    app.use(vite.middlewares);
    console.log('🎨 [NuP-AIM] Vite mounted');
    
    // SPA fallback
    app.use(async (req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.originalUrl.startsWith('/api')) return next();
      
      try {
        const indexPath = path.resolve(__dirname, '..', 'index.html');
        if (!fs.existsSync(indexPath)) {
          return res.status(404).send('index.html not found');
        }
        
        const template = fs.readFileSync(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (error) {
        console.error('❌ [NuP-AIM] SPA error:', error);
        next(error);
      }
    });
    
    console.log('🌐 [NuP-AIM] SPA configured');
    
    // Start server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    console.log(`🎯 [NuP-AIM] Starting server on port ${PORT}...`);
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [NuP-AIM] Server running on http://0.0.0.0:${PORT}`);
      console.log('   Frontend: Vite middleware');
      console.log('   Backend: Express API');
    });

    server.on('error', (error) => {
      console.error('❌ [NuP-AIM] Server error:', error);
      process.exit(1);
    });

    const shutdown = () => {
      console.log('📡 [NuP-AIM] Shutting down...');
      server.close(() => {
        console.log('✅ [NuP-AIM] Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('❌ [NuP-AIM] Fatal error:', error);
    process.exit(1);
  }
}

// Error handlers
process.on('unhandledRejection', (reason) => {
  console.error('❌ [NuP-AIM] Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ [NuP-AIM] Uncaught Exception:', error);
  process.exit(1);
});

// Start
createUnifiedServer();
