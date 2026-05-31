import "server-only";
import { and, eq, gt, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { notasCredito, cuentasPorCobrar, facturas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { aplicarAbono } from "@/lib/domain/cartera";
import type { Contexto } from "./bodegas";

export class NotaCreditoInvalida extends Error {}

export interface FacturaConSaldo {
  facturaId: number;
  cxcId: number;
  numero: string;
  saldo: number;
}

/** Facturas de un cliente que aún tienen saldo (a las que se les puede hacer NC). */
export async function facturasConSaldoDeCliente(empresaId: number, clienteId: number): Promise<FacturaConSaldo[]> {
  const rows = await db
    .select({ facturaId: facturas.id, cxcId: cuentasPorCobrar.id, numero: facturas.numero, saldo: cuentasPorCobrar.saldoPendiente })
    .from(cuentasPorCobrar)
    .innerJoin(facturas, eq(cuentasPorCobrar.facturaId, facturas.id))
    .where(and(eq(cuentasPorCobrar.empresaId, empresaId), eq(cuentasPorCobrar.clienteId, clienteId), gt(cuentasPorCobrar.saldoPendiente, "0")));
  return rows.map((r) => ({ facturaId: r.facturaId, cxcId: r.cxcId, numero: r.numero, saldo: Number(r.saldo) }));
}

export interface NuevaNotaCredito {
  clienteId: number;
  facturaId: number;
  fecha: string;
  motivo: string;
  valor: number;
}

/**
 * Crea una nota crédito MANUAL (descuento/corrección sobre una factura), sin
 * devolución de mercancía: registra la NC y reduce el saldo de esa factura.
 * El valor no puede exceder el saldo pendiente.
 */
export async function crearNotaCreditoManual(data: NuevaNotaCredito, ctx: Contexto): Promise<number> {
  if (data.valor <= 0) throw new NotaCreditoInvalida("El valor debe ser mayor a cero.");

  const [cxc] = await db
    .select({ id: cuentasPorCobrar.id, saldo: cuentasPorCobrar.saldoPendiente, numero: facturas.numero })
    .from(cuentasPorCobrar)
    .innerJoin(facturas, eq(cuentasPorCobrar.facturaId, facturas.id))
    .where(and(
      eq(cuentasPorCobrar.empresaId, ctx.empresaId),
      eq(cuentasPorCobrar.facturaId, data.facturaId),
      eq(cuentasPorCobrar.clienteId, data.clienteId),
    ))
    .limit(1);
  if (!cxc) throw new NotaCreditoInvalida("La factura no tiene saldo o no es de ese cliente.");
  const saldo = Number(cxc.saldo);
  if (data.valor > saldo) throw new NotaCreditoInvalida(`El valor no puede superar el saldo (${saldo}).`);

  const [{ n }] = await db.select({ n: count() }).from(notasCredito).where(eq(notasCredito.empresaId, ctx.empresaId));
  const numero = formatearNumero("NC", Number(n) + 1);

  return db.transaction(async (tx) => {
    const [nc] = await tx
      .insert(notasCredito)
      .values({
        empresaId: ctx.empresaId,
        clienteId: data.clienteId,
        facturaId: data.facturaId,
        numero,
        fecha: data.fecha,
        motivo: data.motivo,
        valor: String(data.valor),
        usuarioId: ctx.usuarioId,
      })
      .returning();

    const r = aplicarAbono(saldo, data.valor);
    await tx
      .update(cuentasPorCobrar)
      .set({ saldoPendiente: String(r.nuevoSaldo), updatedAt: new Date() })
      .where(eq(cuentasPorCobrar.id, cxc.id));

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx25", modelId: nc.id, accion: "CREAR", registroNuevo: nc, ipOrigen: ctx.ip },
      tx,
    );
    return nc.id;
  });
}
