// One-off migration runner: node db/migrate.mjs
// Reads DATABASE_URL_UNPOOLED from .env.local (direct connection, required
// for DDL per Neon's pooled-vs-direct guidance) and applies every .sql file
// in db/migrations in filename order.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const connectionString = env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  console.error("DATABASE_URL_UNPOOLED not found in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const dir = path.join(here, "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  const sql = readFileSync(path.join(dir, file), "utf8");
  console.log(`Applying ${file}...`);
  await client.query(sql);
}

await client.end();
console.log("Done.");
