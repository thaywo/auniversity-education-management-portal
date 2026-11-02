import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __portalMysqlPool?: mysql.Pool;
};

export const pool =
  globalForDb.__portalMysqlPool ??
  mysql.createPool(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__portalMysqlPool = pool;
}

export const db = drizzle(pool);
