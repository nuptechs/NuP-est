import express from 'express';
import ViteExpress from 'vite-express';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from NuP App!' });
});

if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  
  app.use(express.static(path.join(__dirname, '../public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} else {
  ViteExpress.listen(app, PORT, () => {
    console.log(`Development server running on http://localhost:${PORT}`);
  });
}
