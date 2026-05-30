import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { retenciones } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { RetencionConfig } from "@/lib/domain/retenciones";
import type { RetencionInput } from "@/lib/validation/retencion";
import type { Contexto } from "./bodegas";

export type Retencion = typeof retenciones.$inferSelect;

export async function listarRetenciones(empresaId: number): Promise<Retencion[]> {
  return db
    .select()
    .from(retenciones)
    .where(eq(retenciones.empresaId, empresaId))
    .orderBy(desc(retenciones.activa), retenciones.nombre);
}

export async function obtenerRetencion(empresaId: number, id: number): Promise<Retencion | null> {
  const [r] = await db
    .select()
    .from(retenciones)
    .where(and(eq(retenciones.empresaId, empresaId), eq(retenciones.id, id)))
    .limit(1);
  return r ?? null;
}

/** Retenciones activas como configuración para el cálculo. */
export async function retencionesActivas(empresaId: number): Promise<RetencionConfig[]> {
  const rows = await db
    .select()
    .from(retenciones)
    .where(and(eq(retenciones.empresaId, empresaId), eq(retenciones.activa, true)));
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    porcentaje: Number(r.porcentaje),
    baseMinima: Number(r.baseMinima),
    aplicaTodas: r.aplicaTodas,
    activa: r.activa,
  }));
}

function aColumnas(data: RetencionInput) {
  return {
    nombre: data.nombre,
    porcentaje: String(data.porcentaje),
    baseMinima: String(data.baseMinima),
    aplicaTodas: data.aplicaTodas,
    activa: data.activa,
  };
}

export async function crearRetencion(data: RetencionInput, ctx: Contexto): Promise<void> {
  const [r] = await db
    .insert(retenciones)
    .values({ empresaId: ctx.empresaId, ...aColumnas(data) })
    .returning();
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx31",
    modelId: r.id,
    accion: "CREAR",
    registroNuevo: r,
    ipOrigen: ctx.ip,
  });
}

export async function actualizarRetencion(id: number, data: RetencionInput, ctx: Contexto): Promise<void> {
  const anterior = await obtenerRetencion(ctx.empresaId, id);
  if (!anterior) throw new Error("Retención no encontrada.");
  const [r] = await db
    .update(retenciones)
    .set({ ...aColumnas(data), updatedAt: new Date() })
    .where(and(eq(retenciones.empresaId, ctx.empresaId), eq(retenciones.id, id)))
    .returning();
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx31",
    modelId: id,
    accion: "ACTUALIZAR",
    registroAnterior: anterior,
    registroNuevo: r,
    ipOrigen: ctx.ip,
  });
}

export async function cambiarEstadoRetencion(id: number, activa: boolean, ctx: Contexto): Promise<void> {
  await db
    .update(retenciones)
    .set({ activa, updatedAt: new Date() })
    .where(and(eq(retenciones.empresaId, ctx.empresaId), eq(retenciones.id, id)));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx31",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activa },
    ipOrigen: ctx.ip,
  });
}
