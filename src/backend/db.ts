import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_HOST;

if (!url) {
  console.warn("[vocablab] DATABASE_URL is not set — server DB calls will fail");
}

/** Shared Postgres client (postgres.js). Lazy-safe when URL missing until first query. */
export const sql = postgres(url || "postgresql://invalid", {
  max: 8,
  idle_timeout: 20,
  connect_timeout: 10,
});
