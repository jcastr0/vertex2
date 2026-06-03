import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { solicitudesRegistro } from "@/lib/db/schema";

/** Registra una solicitud de un número desconocido (si no hay ya una pendiente igual). */
export async function registrarSolicitud(empresaId: number, telefono: string, mensaje: string): Promise<void> {
  const [pend] = await db
    .select({ id: solicitudesRegistro.id })
    .from(solicitudesRegistro)
    .where(and(eq(solicitudesRegistro.empresaId, empresaId), eq(solicitudesRegistro.telefono, telefono), eq(solicitudesRegistro.estado, "pendiente")))
    .limit(1);
  if (pend) return; // ya hay una pendiente de ese número; no duplicar
  await db.insert(solicitudesRegistro).values({ empresaId, telefono, mensaje: mensaje.slice(0, 500) });
}

export async function listarSolicitudes(empresaId: number) {
  return db
    .select()
    .from(solicitudesRegistro)
    .where(eq(solicitudesRegistro.empresaId, empresaId))
    .orderBy(desc(solicitudesRegistro.createdAt));
}
