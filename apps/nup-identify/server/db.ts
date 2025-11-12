import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { identityTables } from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL environment variable is required for database connection`
  );
}

// Configure Neon client with search_path
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("options", "--search_path%3Dnup_identify%2Cpublic");
const client = neon(databaseUrl.toString(), {
  fetchOptions: {
    cache: "no-store",
  },
});

export const db = drizzle(client, { schema: identityTables });
