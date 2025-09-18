import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Maximum connections in pool (optimized for serverless)
  idleTimeoutMillis: 15000, // Close idle connections after 15s (faster cleanup)
  connectionTimeoutMillis: 5000, // Timeout for new connections after 5s
});
export const db = drizzle({ client: pool, schema });