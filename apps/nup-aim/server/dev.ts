import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

async function createUnifiedServer() {
  try {
    console.log('🔧 Starting unified server initialization...');
    
    // Set environment flag BEFORE importing to prevent double listening
    process.env.COMPOSED_DEV = '1';
    
    console.log('📦 Importing API application...');
    // Dynamic import to ensure the flag is set before server/index.ts evaluates
    const { default: apiApp } = await import('./index');
    console.log('✅ API application imported successfully');
    
    const app = express();
    
    // Mount API routes first
    app.use(apiApp);
    console.log('🛣️  API routes mounted');
    
    // Create Vite server in middleware mode
    console.log('⚡ Creating Vite server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    console.log('✅ Vite server created successfully');
    
    // Use Vite's middleware
    app.use(vite.middlewares);
    console.log('🎨 Vite middleware mounted');
    
    // SPA fallback handler (pathless middleware, Express 5-safe)
    app.use(async (req, res, next) => {
      try {
        // Only handle GET requests and skip API routes, widgets, and custom fields admin
        if (req.method !== 'GET') return next();
        if (req.originalUrl.startsWith('/api')) return next();
        if (req.originalUrl.startsWith('/widgets')) return next();
        if (req.originalUrl.startsWith('/custom-fields-admin')) return next();
        
        const url = req.originalUrl;
        const indexPath = path.resolve('index.html');
        
        if (!fs.existsSync(indexPath)) {
          return res.status(404).send('index.html not found');
        }
        
        const template = fs.readFileSync(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (error) {
        console.error('❌ SPA fallback error:', error);
        next(error);
      }
    });
    
    console.log('🌐 SPA fallback handler configured');
    
    // Start unified server on port 3000
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Unified dev server running on http://0.0.0.0:${PORT}`);
      console.log('   Frontend: Vite middleware');
      console.log('   Backend: Express API routes');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });

    // Handle process termination gracefully
    process.on('SIGTERM', () => {
      console.log('📡 Received SIGTERM, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📡 Received SIGINT, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Error during server initialization:', error);
    throw error;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

createUnifiedServer().catch((error) => {
  console.error('❌ Failed to create unified server:', error);
  process.exit(1);
});