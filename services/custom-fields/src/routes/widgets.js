import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve admin panel with dynamic API base URL injection
router.get('/admin', (req, res) => {
  // Detect API base URL from request headers or environment
  const apiBase = process.env.CUSTOM_FIELDS_API_BASE || 
                  req.headers['x-api-base'] || 
                  `/api/custom-fields-proxy`;
  
  // Read the HTML template
  const htmlPath = join(__dirname, '../views/admin-panel.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Inject configuration script before </head>
  const configScript = `
  <script>
    // Auto-injected configuration
    window.CUSTOM_FIELDS_CONFIG = {
      apiBase: '${apiBase}'
    };
  </script>`;
  
  html = html.replace('</head>', `${configScript}\n</head>`);
  
  res.type('text/html').send(html);
});

// Serve demo integration page
router.get('/demo', (req, res) => {
  res.sendFile(join(__dirname, '../views/demo-integration.html'));
});

// Serve CSS
router.get('/styles.css', (req, res) => {
  res.sendFile(join(__dirname, '../public/styles.css'));
});

// Serve JavaScript with dynamic API base URL
router.get('/admin.js', (req, res) => {
  const jsPath = join(__dirname, '../public/admin.js');
  let js = fs.readFileSync(jsPath, 'utf-8');
  
  // Replace hardcoded API base with config
  js = js.replace(
    /const API_BASE = ['"]http:\/\/localhost:3002\/api['"];/,
    `const API_BASE = window.CUSTOM_FIELDS_CONFIG?.apiBase || '/api/custom-fields-proxy';`
  );
  
  res.type('application/javascript').send(js);
});

// Serve SDK (for integration)
router.get('/custom-fields-sdk.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(join(__dirname, '../public/custom-fields-sdk.js'));
});

// Serve React integration (for React apps)
router.get('/react-integration.jsx', (req, res) => {
  res.type('application/javascript');
  res.sendFile(join(__dirname, '../public/react-integration.jsx'));
});

export { router as widgetsRouter };
