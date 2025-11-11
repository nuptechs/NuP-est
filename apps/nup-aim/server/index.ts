import express from 'express';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Register all routes
registerRoutes(app);

// Export for dev server
export default app;

// Start server only if not in composed dev mode
if (!process.env.COMPOSED_DEV) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [NuP-AIM] Server running on port ${PORT}`);
  });
}
