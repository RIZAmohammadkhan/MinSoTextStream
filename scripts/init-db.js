import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { config } from 'dotenv';
import path from "path";
import { fileURLToPath } from 'url';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function initializeDatabase() {
  console.log("Connecting to database...");
  console.log("Database URL:", databaseUrl.replace(/:[^:]*@/, ':***@')); // Hide password in logs
  
  let pool;
  
  try {
    // Create a connection pool
    pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    
    console.log("Running database migrations...");
    
    // Run migrations
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "migrations")
    });
    
    console.log("Database migrations completed successfully!");
    
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

initializeDatabase();
