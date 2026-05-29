import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bodegas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { BodegaInput } from "@/lib/validation/bodega";

export type Bodega = typeof bodegas.$inferSelect;

export interface Contexto {
  empresaId: number;
  usuarioId: number;
  ip?: string | null;
}

/** Lista las bodegas de una empresa (activas primero, por código). */
export async function listarBodegas(empresaId: number): Promise<Bodega[]> {
  return db
    .select()
    .from(bodegas)
    .where(eq(bodegas.empresaId, empresaId))
    .orderBy(desc(bodegas.activo), bodegas.codigo);
}

/** Obtiene una bodega de la empresa, o null. */
export async function obtenerBodega(empresaId: number, id: number): Promise<Bodega | null> {
  const [b] = await db
    .select()
    .from(bodegas)
    .where(and(eq(bodegas.empresaId, empresaId), eq(bodegas.id, id)))
    .limit(1);
  return b ?? null;
}

class ConflictoCodigo extends Error {}
export { ConflictoCodigo };

function esViolacionUnica(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

/** Crea una bodega. Si es principal, desmarca las demás de la empresa. */
export async function crearBodega(data: BodegaInput, ctx: Contexto): Promise<Bodega> {
  try {
    return await db.transaction(async (tx) => {
      if (data.esPrincipal) {
        await tx
          .update(bodegas)
          .set({ esPrincipal: false })
          .where(eq(bodegas.empresaId, ctx.empresaId));
      }
      const [creada] = await tx
        .insert(bodegas)
        .values({
          empresaId: ctx.empresaId,
          codigo: data.codigo,
          nombre: data.nombre,
          direccion: data.direccion || null,
          responsable: data.responsable || null,
          telefono: data.telefono || null,
          esPrincipal: data.esPrincipal,
        })
        .returning();

      await registrarAuditoria(
        {
          empresaId: ctx.empresaId,
          usuarioId: ctx.usuarioId,
          tablaAfectada: "vx06_bodegas",
          modelId: creada.id,
          accion: "CREAR",
          registroNuevo: creada,
          ipOrigen: ctx.ip,
        },
        tx,
      );
      return creada;
    });
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoCodigo("Ya existe una bodega con ese código.");
    throw e;
  }
}

/** Actualiza una bodega de la empresa. */
export async function actualizarBodega(
  id: number,
  data: BodegaInput,
  ctx: Contexto,
): Promise<Bodega> {
  const anterior = await obtenerBodega(ctx.empresaId, id);
  if (!anterior) throw new Error("Bodega no encontrada.");

  try {
    return await db.transaction(async (tx) => {
      if (data.esPrincipal) {
        await tx
          .update(bodegas)
          .set({ esPrincipal: false })
          .where(eq(bodegas.empresaId, ctx.empresaId));
      }
      const [actualizada] = await tx
        .update(bodegas)
        .set({
          codigo: data.codigo,
          nombre: data.nombre,
          direccion: data.direccion || null,
          responsable: data.responsable || null,
          telefono: data.telefono || null,
          esPrincipal: data.esPrincipal,
          updatedAt: new Date(),
        })
        .where(and(eq(bodegas.empresaId, ctx.empresaId), eq(bodegas.id, id)))
        .returning();

      await registrarAuditoria(
        {
          empresaId: ctx.empresaId,
          usuarioId: ctx.usuarioId,
          tablaAfectada: "vx06_bodegas",
          modelId: id,
          accion: "ACTUALIZAR",
          registroAnterior: anterior,
          registroNuevo: actualizada,
          ipOrigen: ctx.ip,
        },
        tx,
      );
      return actualizada;
    });
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoCodigo("Ya existe una bodega con ese código.");
    throw e;
  }
}

/** Activa/desactiva (soft delete) una bodega. */
export async function cambiarEstadoBodega(
  id: number,
  activo: boolean,
  ctx: Contexto,
): Promise<void> {
  await db
    .update(bodegas)
    .set({ activo, updatedAt: new Date() })
    .where(and(eq(bodegas.empresaId, ctx.empresaId), eq(bodegas.id, id)));

  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx06_bodegas",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activo },
    ipOrigen: ctx.ip,
  });
}
