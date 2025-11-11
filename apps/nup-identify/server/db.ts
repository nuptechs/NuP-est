import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL environment variable is required for database connection`
  );
}

// Create Neon HTTP client with schema search path
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("options", "--search_path=nup_identify,public");
const client = neon(databaseUrl.toString());

export const db = drizzle({ client, schema });
