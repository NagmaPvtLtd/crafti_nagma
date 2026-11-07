
/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql from "mysql2/promise";
import { getProduction } from "../../utils/ValueFetcher/getProduction.util";

const isProduction: boolean = getProduction();

export const dbName = isProduction
  ? process.env.PROD_DB_NAME!
  : process.env.LOCAL_DB_NAME!;

const dbHost = isProduction
  ? process.env.PROD_DB_HOST!
  : process.env.LOCAL_DB_HOST!;

const dbUser = isProduction
  ? process.env.PROD_DB_USER!
  : process.env.LOCAL_DB_USER!;

const dbPass = isProduction
  ? process.env.PROD_DB_PASS!
  : process.env.LOCAL_DB_PASS!;

const dbPort = isProduction
  ? process.env.PROD_DB_PORT
    ? parseInt(process.env.PROD_DB_PORT, 10)
    : 3306
  : process.env.LOCAL_DB_PORT
    ? parseInt(process.env.LOCAL_DB_PORT, 10)
    : 3306;

/**
 * @brief SSL configuration for TiDB Cloud production connections.
 * Local MySQL connections do not require SSL.
 */
const dbSsl = isProduction
  ? {
      minVersion: "TLSv1.2" as const,
    }
  : undefined;

/**
 * @brief Ensures the target database exists in the MySQL server.
 *
 * - Connects to the MySQL server without specifying a database.
 * - Checks if the database exists.
 * - Creates the database if it does not exist.
 * - Uses SSL in production for TiDB Cloud connections.
 * - Terminates the application if the connection fails.
 */
export async function ensureDatabaseExists() {
  console.log("[DB - CHECKING] Verifying database availability");

  let connection: mysql.Connection | undefined;

  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      port: dbPort,
      ssl: dbSsl,
    });

    const [rows] = await connection.query(
      "SHOW DATABASES LIKE ?",
      [dbName],
    );

    if ((rows as any[]).length === 0) {
      await connection.query(`CREATE DATABASE \`${dbName}\``);
      console.log(`[DB - CREATE] >_ Database '${dbName}' created`);
    } else {
      console.log(`[DB - SKIP] ➤ Database '${dbName}' already exists`);
    }
  } catch (err) {
    console.error("[DB - FAILED] Failed to connect to MySQL:", err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(console.error);
    }
  }
}

/**
 * @brief Creates and returns a MySQL connection pool.
 *
 * - Uses production or local database credentials.
 * - Enables SSL/TLS for production TiDB Cloud connections.
 * - Keeps local MySQL connections unchanged.
 * - Supports multiple SQL statements for migrations.
 * - Uses a maximum of 10 simultaneous connections.
 */
export function createPool() {
  try {
    return mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      database: dbName,
      port: dbPort,
      ssl: dbSsl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });
  } catch (err: unknown) {
    console.error("[DB - FAILED] Connection to database failed:", err);
    process.exit(1);
  }
}
