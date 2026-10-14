import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | undefined;

// Pooled connection (PgBouncer) for ordinary application query traffic, per
// Neon's Vercel guidance. A single pool is reused across invocations under
// Fluid Compute; attachDatabasePool lets Vercel drain it on function freeze.
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    attachDatabasePool(pool);
  }
  return pool;
}
