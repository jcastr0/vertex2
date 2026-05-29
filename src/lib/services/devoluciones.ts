import "server-only";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  devoluciones,
  devolucionDetalles,
  notasCredito,
  cuentasPorCobrar,
  inventario,
  movimientosInventario,
  terceros,
} from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { aplicarAbono } from "@/lib/domain/cartera";
import type { Contexto } from "./bodegas";

export class DevolucionInvalida extends Error {}

export interface LineaDevolucion {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}
export interface NuevaDevolucion {
  bodegaId: number;
  clienteId: number;
  facturaId?: number | null;
  fecha: string;
  motivo: string;
  lineas: LineaDevolucion[];
}

export async function listarDevoluciones(empresaId: number) {
  return db
    .select({ devolucion: devoluciones, cliente: terceros.razonSocial })
    .from(devoluciones)
    .innerJoin(terceros, eq(devoluciones.clienteId, terceros.id))
    .where(eq(devoluciones.empresaId, empresaId))
    .orderBy(desc(devoluciones.createdAt));
}

export async function listarNotasCredito(empresaId: number) {
  return db
    .select({ nota: notasCredito, cliente: terceros.razonSocial })
    .from(notasCredito)
    .innerJoin(terceros, eq(notasCredito.clienteId, terceros.id))
    .where(eq(notasCredito.empresaId, empresaId))
    .orderBy(desc(notasCredito.createdAt));
}

/**
 * Procesa una devolución de cliente: reingresa los productos al inventario,
 * genera la nota crédito y reduce la cuenta por cobrar de la factura (si existe).
 */
export async function crearDevolucionCliente(data: NuevaDevolucion, ctx: Contexto): Promise<number> {
  if (data.lineas.length === 0) throw new DevolucionInvalida("Agrega al menos un producto.");
  const [{ c: cDev }] = await db
    .select({ c: count() })
    .from(devoluciones)
    .where(eq(devoluciones.empresaId, ctx.empresaId));
  const [{ c: cNc }] = await db
    .select({ c: count() })
    .from(notasCredito)
    .where(eq(notasCredito.empresaId, ctx.empresaId));
  const numeroDev = formatearNumero("DEV", Number(cDev) + 1);
  const numeroNc = formatearNumero("NC", Number(cNc) + 1);
  const total = data.lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0);

  return db.transaction(async (tx) => {
    const [dev] = await tx
      .insert(devoluciones)
      .values({
        empresaId: ctx.empresaId,
        bodegaId: data.bodegaId,
        tipo: "cliente",
        clienteId: data.clienteId,
        facturaId: data.facturaId ?? null,
        numero: numeroDev,
        fecha: data.fecha,
        motivo: data.motivo,
        total: String(total),
        estado: "procesada",
        usuarioId: ctx.usuarioId,
      })
      .returning();

    for (const l of data.lineas) {
      await tx.insert(devolucionDetalles).values({
        devolucionId: dev.id,
        productoId: l.productoId,
        cantidad: String(l.cantidad),
        precioUnitario: String(l.precioUnitario),
        subtotal: String(l.cantidad * l.precioUnitario),
      });

      // Reingreso al inventario (al costo promedio actual; si no existe, 0).
      const [inv] = await tx
        .select()
        .from(inventario)
        .where(
          and(
            eq(inventario.empresaId, ctx.empresaId),
            eq(inventario.bodegaId, data.bodegaId),
            eq(inventario.productoId, l.productoId),
          ),
        )
        .limit(1);
      const actual = inv ? Number(inv.cantidadActual) : 0;
      const costo = inv ? Number(inv.costoPromedio) : 0;
      const nueva = actual + l.cantidad;
      if (inv) {
        await tx
          .update(inventario)
          .set({ cantidadActual: String(nueva), valorTotal: String(nueva * costo), ultimaActualizacion: new Date(), updatedAt: new Date() })
          .where(eq(inventario.id, inv.id));
      } else {
        await tx.insert(inventario).values({
          empresaId: ctx.empresaId,
          bodegaId: data.bodegaId,
          productoId: l.productoId,
          cantidadActual: String(l.cantidad),
          costoPromedio: "0",
          valorTotal: "0",
          ultimaActualizacion: new Date(),
        });
      }

      await tx.insert(movimientosInventario).values({
        empresaId: ctx.empresaId,
        bodegaId: data.bodegaId,
        productoId: l.productoId,
        tipo: "entrada",
        cantidad: String(l.cantidad),
        costoUnitario: String(costo),
        referencia: numeroDev,
        observaciones: "Devolución de cliente",
        usuarioId: ctx.usuarioId,
      });
    }

    // Nota crédito
    await tx.insert(notasCredito).values({
      empresaId: ctx.empresaId,
      clienteId: data.clienteId,
      facturaId: data.facturaId ?? null,
      devolucionId: dev.id,
      numero: numeroNc,
      fecha: data.fecha,
      motivo: data.motivo,
      valor: String(total),
      usuarioId: ctx.usuarioId,
    });

    // Reducir la cuenta por cobrar de la factura (si existe y tiene saldo).
    if (data.facturaId) {
      const [cxc] = await tx
        .select()
        .from(cuentasPorCobrar)
        .where(
          and(eq(cuentasPorCobrar.empresaId, ctx.empresaId), eq(cuentasPorCobrar.facturaId, data.facturaId)),
        )
        .limit(1);
      if (cxc) {
        const r = aplicarAbono(Number(cxc.saldoPendiente), total);
        await tx
          .update(cuentasPorCobrar)
          .set({ saldoPendiente: String(r.nuevoSaldo), updatedAt: new Date() })
          .where(eq(cuentasPorCobrar.id, cxc.id));
      }
    }

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx23_devoluciones",
        modelId: dev.id,
        accion: "CREAR",
        registroNuevo: dev,
        ipOrigen: ctx.ip,
      },
      tx,
    );
    return dev.id;
  });
}
