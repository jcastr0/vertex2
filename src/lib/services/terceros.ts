import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { terceros } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { digitoVerificacionPara } from "@/lib/domain/nit";
import type { TerceroInput } from "@/lib/validation/tercero";
import type { Contexto } from "./bodegas";

export type Tercero = typeof terceros.$inferSelect;

export class ConflictoTercero extends Error {}

function esViolacionUnica(e: unknown): boolean {
  return (
    typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505"
  );
}

/** Mapea el input validado a columnas de la tabla, calculando el DV para NIT. */
function aColumnas(data: TerceroInput) {
  const dv = digitoVerificacionPara(data.tipoIdentificacion, data.identificacion);
  return {
    tipo: data.tipo,
    codigo: data.codigo,
    razonSocial: data.razonSocial,
    nombreComercial: data.nombreComercial || null,
    tipoIdentificacion: data.tipoIdentificacion,
    identificacion: data.identificacion,
    digitoVerificacion: dv,
    tipoPersona: data.tipoPersona,
    email: data.email || null,
    telefono: data.telefono || null,
    celular: data.celular || null,
    direccion: data.direccion || null,
    ciudad: data.ciudad || null,
    departamento: data.departamento || null,
    condicionesPago: data.condicionesPago || null,
    diasCreditoProveedor: data.diasCreditoProveedor,
    cupoCredito: String(data.cupoCredito),
    diasCreditoCliente: data.diasCreditoCliente,
    requiereFacturaElectronica: data.requiereFacturaElectronica,
    observaciones: data.observaciones || null,
    recaudadorId: data.recaudadorId,
    diaCobro: data.diaCobro,
  };
}

export async function listarTerceros(empresaId: number): Promise<Tercero[]> {
  return db
    .select()
    .from(terceros)
    .where(eq(terceros.empresaId, empresaId))
    .orderBy(desc(terceros.activo), terceros.razonSocial);
}

export async function obtenerTercero(empresaId: number, id: number): Promise<Tercero | null> {
  const [t] = await db
    .select()
    .from(terceros)
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.id, id)))
    .limit(1);
  return t ?? null;
}

export async function crearTercero(data: TerceroInput, ctx: Contexto): Promise<Tercero> {
  try {
    const [creado] = await db
      .insert(terceros)
      .values({ empresaId: ctx.empresaId, ...aColumnas(data) })
      .returning();
    await registrarAuditoria({
      empresaId: ctx.empresaId,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx07_terceros",
      modelId: creado.id,
      accion: "CREAR",
      registroNuevo: creado,
      ipOrigen: ctx.ip,
    });
    return creado;
  } catch (e) {
    if (esViolacionUnica(e))
      throw new ConflictoTercero("Ya existe un tercero con ese código o identificación.");
    throw e;
  }
}

export async function actualizarTercero(
  id: number,
  data: TerceroInput,
  ctx: Contexto,
): Promise<Tercero> {
  const anterior = await obtenerTercero(ctx.empresaId, id);
  if (!anterior) throw new Error("Tercero no encontrado.");
  try {
    const [actualizado] = await db
      .update(terceros)
      .set({ ...aColumnas(data), updatedAt: new Date() })
      .where(and(eq(terceros.empresaId, ctx.empresaId), eq(terceros.id, id)))
      .returning();
    await registrarAuditoria({
      empresaId: ctx.empresaId,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx07_terceros",
      modelId: id,
      accion: "ACTUALIZAR",
      registroAnterior: anterior,
      registroNuevo: actualizado,
      ipOrigen: ctx.ip,
    });
    return actualizado;
  } catch (e) {
    if (esViolacionUnica(e))
      throw new ConflictoTercero("Ya existe un tercero con ese código o identificación.");
    throw e;
  }
}

export async function cambiarEstadoTercero(
  id: number,
  activo: boolean,
  ctx: Contexto,
): Promise<void> {
  await db
    .update(terceros)
    .set({ activo, updatedAt: new Date() })
    .where(and(eq(terceros.empresaId, ctx.empresaId), eq(terceros.id, id)));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx07_terceros",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activo },
    ipOrigen: ctx.ip,
  });
}
