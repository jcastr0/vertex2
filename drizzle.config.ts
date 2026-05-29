import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Migraciones/DDL: preferir el pooler de sesión (5432); cae a DATABASE_URL.
    url:
      process.env.DATABASE_URL_SESSION ??
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/placeholder",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
