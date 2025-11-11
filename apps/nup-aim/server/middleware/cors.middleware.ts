import cors from 'cors';

const allowedOrigins = [
  'http://localhost:5173', 
  'http://0.0.0.0:5173', 
  'http://127.0.0.1:5173',
  'http://localhost:5000', 
  'http://0.0.0.0:5000',
  ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
  ...(process.env.REPLIT_DEV_DOMAIN ? [
    `https://${process.env.REPLIT_DEV_DOMAIN}`,
    `https://${process.env.REPLIT_DEV_DOMAIN}:6800`
  ] : [])
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
});
