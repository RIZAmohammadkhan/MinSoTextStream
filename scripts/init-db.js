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

async function waitForDatabase(pool, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query('SELECT 1');
      console.log("Database connection successful!");
      return;
    } catch (error) {
      console.log(`Database connection attempt ${i + 1}/${maxAttempts} failed:`, error.message);
      if (i === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function initializeDatabase() {
  console.log("Connecting to database...");
  console.log("Database URL:", databaseUrl.replace(/:[^:]*@/, ':***@')); // Hide password in logs
  
  let pool;
  
  try {
    // Create a connection pool
    pool = new Pool({ 
      connectionString: databaseUrl,
      max: 20,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    });
    
    // Wait for database to be ready
    await waitForDatabase(pool);
    
    const db = drizzle(pool);
    
    console.log("Running database migrations...");
    console.log("Migrations folder:", path.join(process.cwd(), "migrations"));
    
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
