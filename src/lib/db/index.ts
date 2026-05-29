import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export { schema };

/**
 * Cliente Drizzle hacia Supabase Postgres.
 *
 * Inicialización perezosa: NO se conecta al importar el módulo, de modo que
 * `next build` no requiere `DATABASE_URL`. La conexión se crea en el primer
 * acceso real a la base (en runtime), donde la env ya está disponible.
 */
let _client: ReturnType<typeof postgres> | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getConnectionString(): string {
  // Preferimos DATABASE_URL; si no, usamos las variables que el integration de
  // Supabase en Vercel inyecta automáticamente (pooler transaccional 6543).
  const url =
    process.env.DATABASE_URL ||
    process.env.STORAGE_VERTEX_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_VERTEX_POSTGRES_URL;
  if (!url) {
    throw new Error(
      "No hay cadena de conexión. Define DATABASE_URL (pooler de Supabase) o usa el integration de Supabase en Vercel.",
    );
  }
  return url;
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    _client = postgres(getConnectionString(), {
      prepare: false, // compatible con el pooler de Supabase (Supavisor) en modo transaction
      max: 5, // pool pequeño: evita deadlocks si una operación anida consultas fuera del tx
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

/**
 * Proxy ergonómico: permite `db.select()...` resolviendo el cliente perezoso
 * en el momento de uso.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
