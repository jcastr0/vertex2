import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles as rolesTabla } from "@/lib/db/schema";
import { getSesion } from "./cookies";
import { ROLES } from "./roles";

/**
 * Permisos efectivos del usuario actual, leídos de la BD (fuente de verdad).
 * - Superadmin → ["*"].
 * - Resto → vx01.permisos del rol (por nombre); si falta, cae al mapa de código.
 * Cacheado por request (React cache) → una sola consulta aunque se llame varias veces.
 */
export const getPermisos = cache(async (): Promise<string[]> => {
  const sesion = await getSesion();
  if (!sesion) return [];
  if (sesion.esSuperadmin) return ["*"];
  if (!sesion.rol) return [];
  const [r] = await db
    .select({ permisos: rolesTabla.permisos })
    .from(rolesTabla)
    .where(eq(rolesTabla.nombre, sesion.rol))
    .limit(1);
  if (r) return r.permisos ?? [];
  const fallback = ROLES[sesion.rol];
  return fallback ? [...fallback] : [];
});
