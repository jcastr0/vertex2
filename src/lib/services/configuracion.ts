import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { configuracion } from "@/lib/db/schema";
import { resolverConfig } from "@/lib/domain/configuracion";
import { registrarAuditoria } from "@/lib/audit";
import type { Contexto } from "./bodegas";

async function leer(clave: string, empresaId: number): Promise<{ emp?: unknown; glob?: unknown }> {
  const rows = await db
    .select({ empresaId: configuracion.empresaId, valor: configuracion.valor })
    .from(configuracion)
    .where(eq(configuracion.clave, clave));
  let emp: unknown, glob: unknown;
  for (const r of rows) {
    if (r.empresaId === empresaId) emp = r.valor ?? undefined;
    else if (r.empresaId === null) glob = r.valor ?? undefined;
  }
  return { emp, glob };
}

/** Valor de la clave para la empresa (empresa → global → default). */
export async function obtenerConfig<T>(clave: string, empresaId: number, porDefecto: T): Promise<T> {
  const { emp, glob } = await leer(clave, empresaId);
  return resolverConfig(emp as T | undefined, glob as T | undefined, porDefecto);
}

/** Upsert del valor para la empresa (auditado). */
export async function guardarConfig(clave: string, valor: unknown, empresaId: number, ctx: Contexto): Promise<void> {
  const [existente] = await db
    .select({ id: configuracion.id })
    .from(configuracion)
    .where(and(eq(configuracion.clave, clave), eq(configuracion.empresaId, empresaId)))
    .limit(1);
  if (existente) {
    await db.update(configuracion).set({ valor, updatedAt: new Date() }).where(eq(configuracion.id, existente.id));
  } else {
    await db.insert(configuracion).values({ empresaId, clave, valor });
  }
  await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx41", accion: "ACTUALIZAR", registroNuevo: { clave, valor }, ipOrigen: ctx.ip });
}

export const MENSAJE_NO_REGISTRADO_DEFAULT =
  "Para tomar tu pedido primero debemos registrarte. Al ser tu primera compra, hacemos un proceso de registro de 24 horas; recibirás una confirmación cuando sea autorizado. ¡Gracias!";

export function botActivo(empresaId: number): Promise<boolean> {
  return obtenerConfig<boolean>("bot.activo", empresaId, false);
}
export function mensajeNoRegistrado(empresaId: number): Promise<string> {
  return obtenerConfig<string>("bot.mensajeNoRegistrado", empresaId, MENSAJE_NO_REGISTRADO_DEFAULT);
}
