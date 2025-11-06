import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { customFieldsRouter } from './routes/customFields.js';
import { formsRouter } from './routes/forms.js';
import { sectionsRouter } from './routes/sections.js';
import { widgetsRouter } from './routes/widgets.js';
import { initDatabase } from './database/init.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware - disable for widgets serving
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5000', 'https://nup-aim.netlify.app'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database
await initDatabase();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NuP_AIM Custom Fields Service',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/custom-fields', customFieldsRouter);
app.use('/api/forms', formsRouter);
app.use('/api/sections', sectionsRouter);

// Widget routes (serve HTML/CSS/JS)
app.use('/widgets', widgetsRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found.`
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Custom Fields Service running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔧 API Base URL: http://localhost:${PORT}/api`);
  logger.info(`🎨 Admin Panel: http://localhost:${PORT}/widgets/admin`);
  logger.info(`📖 Demo Page: http://localhost:${PORT}/widgets/demo`);
});

export default app;