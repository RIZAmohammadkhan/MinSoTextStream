import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export the pool for closing connections if needed
export { pool };
