import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;
let database: ReturnType<typeof drizzle> | null = null;

export function hasDatabaseConnection() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  if (!database) {
    database = drizzle({ client: pool });
  }

  return database;
}
