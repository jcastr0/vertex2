import "server-only";
import { cookies } from "next/headers";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import type { SessionPayload } from "./session";
import { elegirEmpresa } from "./empresa-resolver";

export const COOKIE_EMPRESA = "vx_empresa";

/**
 * Resuelve la empresa activa (ver {@link elegirEmpresa}).
 *  - Usuario normal: su `empresaId`.
 *  - Superadmin: la elegida en cookie (selector), o la primera activa.
 */
export async function empresaActivaId(sesion: SessionPayload): Promise<number | null> {
  if (sesion.empresaId != null) return sesion.empresaId;
  if (!sesion.esSuperadmin) return null;

  const store = await cookies();
  const cookie = store.get(COOKIE_EMPRESA)?.value ?? null;

  let primeraId: number | null = null;
  if (!cookie || Number.isNaN(Number(cookie))) {
    const [primera] = await db
      .select({ id: empresas.id })
      .from(empresas)
      .orderBy(asc(empresas.id))
      .limit(1);
    primeraId = primera?.id ?? null;
  }
  return elegirEmpresa(null, true, cookie, primeraId);
}

/** Lista de empresas (para el selector del superadmin). */
export async function listarEmpresas() {
  return db.select().from(empresas).orderBy(asc(empresas.nombre));
}
