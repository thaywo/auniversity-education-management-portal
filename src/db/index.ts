import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __portalMysqlPool?: mysql.Pool;
};

const isRemoteOrCloud =
  !databaseUrl.includes("localhost") &&
  !databaseUrl.includes("127.0.0.1");

export const pool =
  globalForDb.__portalMysqlPool ??
  mysql.createPool({
    uri: databaseUrl,
    ssl: isRemoteOrCloud ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__portalMysqlPool = pool;
}

export const db = drizzle(pool);
