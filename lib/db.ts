import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Tagged-template SQL client (HTTP-based, works in Node and Edge runtimes).
export const sql = neon(process.env.DATABASE_URL);
