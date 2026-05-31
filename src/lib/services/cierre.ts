// src/lib/services/cierre.ts
import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cierres, cierreCuentas, cuentasPropias } from "@/lib/db/schema";
import { listarCuentasPropias } from "./tesoreria";
import { diferenciaArqueo } from "@/lib/domain/anulacion";
import { registrarAuditoria } from "@/lib/audit";
import type { Contexto } from "./bodegas";

export class CierreInvalido extends Error {}

export interface CuentaCierre { id: number; nombre: string; tipo: string; esEfectivo: boolean; esperado: number }

/** Cuentas activas con su saldo esperado (saldo corrido actual) para el arqueo. */
export async function cuentasParaCierre(empresaId: number): Promise<CuentaCierre[]> {
  const cuentas = await listarCuentasPropias(empresaId);
  return cuentas
    .filter((c) => c.activa)
    .map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, esEfectivo: c.tipo === "caja", esperado: c.saldo }));
}

export interface ConteoCuenta { cuentaId: number; montoContado?: number }

/** Registra el cierre del día con su detalle por cuenta (diferencia solo en efectivo). */
export async function registrarCierre(empresaId: number, fecha: string, conteos: ConteoCuenta[], observaciones: string | null, ctx: Contexto): Promise<number> {
  const [existe] = await db.select({ id: cierres.id }).from(cierres).where(and(eq(cierres.empresaId, empresaId), eq(cierres.fecha, fecha))).limit(1);
  if (existe) throw new CierreInvalido("Ya existe un cierre para ese día.");

  const cuentas = await cuentasParaCierre(empresaId);
  const porId = new Map(conteos.map((c) => [c.cuentaId, c.montoContado]));

  return db.transaction(async (tx) => {
    const [cierre] = await tx.insert(cierres).values({ empresaId, fecha, usuarioId: ctx.usuarioId, observaciones }).returning();
    for (const c of cuentas) {
      const contado = c.esEfectivo ? porId.get(c.id) : undefined;
      const dif = c.esEfectivo && contado != null ? diferenciaArqueo(c.esperado, contado) : 0;
      await tx.insert(cierreCuentas).values({
        cierreId: cierre.id, cuentaPropiaId: c.id, tipo: c.esEfectivo ? "caja" : "banco",
        saldoEsperado: String(c.esperado), montoContado: contado != null ? String(contado) : null, diferencia: String(dif),
      });
    }
    await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx37", modelId: cierre.id, accion: "CREAR", registroNuevo: { fecha }, ipOrigen: ctx.ip }, tx);
    return cierre.id;
  });
}

export async function listarCierres(empresaId: number) {
  return db.select().from(cierres).where(eq(cierres.empresaId, empresaId)).orderBy(desc(cierres.fecha));
}

export async function obtenerCierre(empresaId: number, id: number) {
  const [c] = await db.select().from(cierres).where(and(eq(cierres.empresaId, empresaId), eq(cierres.id, id))).limit(1);
  if (!c) return null;
  const detalle = await db.select({ d: cierreCuentas, cuenta: cuentasPropias.nombre }).from(cierreCuentas).innerJoin(cuentasPropias, eq(cierreCuentas.cuentaPropiaId, cuentasPropias.id)).where(eq(cierreCuentas.cierreId, id));
  return { ...c, detalle };
}
