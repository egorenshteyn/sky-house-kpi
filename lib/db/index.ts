import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

function resolveDbPath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;

  const bundledDb = path.join(process.cwd(), "sky-house.db");

  // Vercel/serverless filesystems are read-only except /tmp. For a hosted preview,
  // copy the seeded SQLite database into /tmp on cold start. This is not durable
  // storage, but it lets the seeded dashboard run until we migrate to Postgres/Turso.
  if (process.env.VERCEL) {
    const runtimeDb = "/tmp/sky-house.db";
    if (!fs.existsSync(runtimeDb) && fs.existsSync(bundledDb)) {
      fs.copyFileSync(bundledDb, runtimeDb);
    }
    return runtimeDb;
  }

  return bundledDb;
}

const dbPath = resolveDbPath();

let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getSqlite() {
  if (!_sqlite) {
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
  }
  return _sqlite;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  return _db;
}

export const db = getDb();
export { schema };
