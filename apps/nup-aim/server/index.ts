import express from 'express';
import ViteExpress from 'vite-express';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Rotas da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: process.env.npm_package_name });
});

// Iniciar servidor
if (process.env.NODE_ENV === 'development') {
  ViteExpress.listen(app, PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}
