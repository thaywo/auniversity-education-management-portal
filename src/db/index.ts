import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const globalForDb = globalThis as typeof globalThis & {
  __portalMysqlPool?: mysql.Pool;
};

export function sanitizeDatabaseUrl(raw?: string): string {
  let cleaned = (raw || "").trim();
  if (!cleaned) return "";

  // Strip wrapping single or double quotes
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Strip leading "DATABASE_URL=" if accidentally pasted into value field
  if (cleaned.startsWith("DATABASE_URL=")) {
    cleaned = cleaned.slice("DATABASE_URL=".length).trim();
    while (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  return cleaned;
}

function createSafePool(): mysql.Pool {
  const cleaned = sanitizeDatabaseUrl(process.env.DATABASE_URL);

  if (!cleaned) {
    // Harmless fallback for build-time static evaluation
    return mysql.createPool({
      host: "127.0.0.1",
      user: "root",
      database: "auniversity_portal",
    });
  }

  const isRemoteOrCloud =
    !cleaned.includes("localhost") &&
    !cleaned.includes("127.0.0.1");

  try {
    return mysql.createPool({
      uri: cleaned,
      ssl: isRemoteOrCloud ? { rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  } catch {
    // If standard URI parsing fails, fall back to manual regex extraction
    const match = cleaned.match(
      /^(?:mysql|mariadb):\/\/(?:([^:]+)(?::([^@]*))?@)?([^:\/?#]+)(?::(\d+))?(?:\/([^?#]*))?/i
    );
    if (match) {
      const [, user, password, host, port, database] = match;
      const isRemote = host !== "localhost" && host !== "127.0.0.1";
      return mysql.createPool({
        host,
        port: port ? parseInt(port, 10) : 3306,
        user: user ? decodeURIComponent(user) : "root",
        password: password ? decodeURIComponent(password) : undefined,
        database: database ? database.trim() : undefined,
        ssl: isRemote ? { rejectUnauthorized: true } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
      });
    }

    return mysql.createPool({
      host: "127.0.0.1",
      user: "root",
      database: "auniversity_portal",
    });
  }
}

export const pool = globalForDb.__portalMysqlPool ?? createSafePool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__portalMysqlPool = pool;
}

export const db = drizzle(pool);
