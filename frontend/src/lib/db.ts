import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_SERVER,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
