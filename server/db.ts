import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("❌ CRITICAL ERROR: DATABASE_URL environment variable is not set!");
  console.error("Please set DATABASE_URL in Railway dashboard under Variables tab");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("✅ DATABASE_URL is set, attempting to connect...");
console.log("Database host:", new URL(process.env.DATABASE_URL).hostname);

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout
});

export const db = drizzle({ client: pool, schema });

// Test database connection on startup
pool.connect()
  .then(client => {
    console.log("✅ Database connection successful!");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
    console.error("Check your DATABASE_URL and ensure Neon database is accessible");
  });
