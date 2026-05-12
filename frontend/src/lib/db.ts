import { Pool } from "pg";

const poolConfig = process.env.DATABASE_URL
? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }
: {
    host: process.env.POSTGRES_SERVER,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    ssl: { rejectUnauthorized: false },
  };

console.log("🔌 Initializing PG Pool with:", process.env.DATABASE_URL ? "DATABASE_URL" : "Local Config");
const pool = new Pool(poolConfig);

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
