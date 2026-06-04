import "server-only";
import { and, eq, desc, count, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cotizaciones, cotizacionDetalles, productos, terceros } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { totalCotizacion, puedeFacturar, puedeAnular } from "@/lib/domain/cotizacion";
import { crearFactura } from "@/lib/services/facturas";
import type { Contexto } from "./bodegas";

export class CotizacionInvalida extends Error {}

export interface LineaNuevaCotizacion {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}
export interface NuevaCotizacion {
  clienteId: number;
  fecha: string;
  observaciones?: string;
  lineas: LineaNuevaCotizacion[];
  origen?: "manual" | "bot";
  requiereRevision?: boolean;
}

export async function listarCotizaciones(empresaId: number) {
  return db
    .select({ cotizacion: cotizaciones, cliente: terceros.razonSocial })
    .from(cotizaciones)
    .innerJoin(terceros, eq(cotizaciones.clienteId, terceros.id))
    .where(eq(cotizaciones.empresaId, empresaId))
    .orderBy(desc(cotizaciones.createdAt));
}

export async function obtenerCotizacion(empresaId: number, id: number) {
  const [c] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id)))
    .limit(1);
  if (!c) return null;
  const detalles = await db.select().from(cotizacionDetalles).where(eq(cotizacionDetalles.cotizacionId, id));
  return { ...c, detalles };
}

async function siguienteNumero(empresaId: number): Promise<string> {
  const [{ c }] = await db.select({ c: count() }).from(cotizaciones).where(eq(cotizaciones.empresaId, empresaId));
  return formatearNumero("COT", Number(c) + 1);
}

/** Crea una cotización (estado pendiente). NO toca inventario. */
export async function crearCotizacion(data: NuevaCotizacion, ctx: Contexto): Promise<number> {
  if (data.lineas.length === 0) throw new CotizacionInvalida("Agrega al menos un producto.");
  const numero = await siguienteNumero(ctx.empresaId);
  const total = totalCotizacion(data.lineas);

  return db.transaction(async (tx) => {
    const [cot] = await tx
      .insert(cotizaciones)
      .values({
        empresaId: ctx.empresaId,
        clienteId: data.clienteId,
        numero,
        fecha: data.fecha,
        estado: "pendiente",
        total: String(total),
        observaciones: data.observaciones ?? null,
        origen: data.origen ?? "manual",
        requiereRevision: data.requiereRevision ?? false,
        usuarioId: ctx.usuarioId,
      })
      .returning();

    for (const l of data.lineas) {
      await tx.insert(cotizacionDetalles).values({
        cotizacionId: cot.id,
        productoId: l.productoId,
        cantidad: String(l.cantidad),
        precioUnitario: String(l.precioUnitario),
        subtotal: String(l.cantidad * l.precioUnitario),
      });
    }

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: cot.id, accion: "CREAR", registroNuevo: cot, ipOrigen: ctx.ip },
      tx,
    );
    return cot.id;
  });
}

/**
 * Reemplaza las líneas de una cotización PENDIENTE (para "añadir al pedido del
 * día" desde el bot). Devuelve false si la cotización ya no es editable
 * (facturada/anulada) → el llamador debe crear una nueva. Recalcula el total.
 */
export async function reemplazarLineasCotizacion(empresaId: number, id: number, lineas: LineaNuevaCotizacion[], ctx: Contexto): Promise<boolean> {
  if (lineas.length === 0) throw new CotizacionInvalida("Agrega al menos un producto.");
  const [c] = await db.select().from(cotizaciones).where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id))).limit(1);
  if (!c || c.estado !== "pendiente") return false;
  const total = totalCotizacion(lineas);
  await db.transaction(async (tx) => {
    await tx.delete(cotizacionDetalles).where(eq(cotizacionDetalles.cotizacionId, id));
    for (const l of lineas) {
      await tx.insert(cotizacionDetalles).values({
        cotizacionId: id,
        productoId: l.productoId,
        cantidad: String(l.cantidad),
        precioUnitario: String(l.precioUnitario),
        subtotal: String(l.cantidad * l.precioUnitario),
      });
    }
    await tx.update(cotizaciones).set({ total: String(total), requiereRevision: true, updatedAt: new Date() }).where(eq(cotizaciones.id, id));
    await registrarAuditoria(
      { empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: id, accion: "ACTUALIZAR", registroAnterior: c, registroNuevo: { ...c, total: String(total) }, ipOrigen: ctx.ip },
      tx,
    );
  });
  return true;
}

/** Anula una cotización pendiente (no afecta nada más). */
export async function anularCotizacion(empresaId: number, id: number, motivo: string, ctx: Contexto): Promise<void> {
  const [c] = await db.select().from(cotizaciones).where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id))).limit(1);
  if (!c) throw new CotizacionInvalida("Cotización no encontrada.");
  if (!puedeAnular(c.estado)) throw new CotizacionInvalida("Solo se puede anular una cotización pendiente.");
  await db.transaction(async (tx) => {
    await tx.update(cotizaciones).set({ estado: "anulada", motivoAnulacion: motivo, updatedAt: new Date() }).where(eq(cotizaciones.id, id));
    await registrarAuditoria(
      { empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: id, accion: "ACTUALIZAR", registroAnterior: c, registroNuevo: { ...c, estado: "anulada", motivoAnulacion: motivo }, ipOrigen: ctx.ip },
      tx,
    );
  });
}

export interface DatosFacturarCotizacion {
  bodegaId: number;
  fecha: string;
  tipoVenta: "contado" | "credito";
  lineas: LineaNuevaCotizacion[];
  metodoPago?: string;
  cuentaDestinoId?: number;
}

/**
 * Convierte una cotización pendiente en factura. Reusa `crearFactura` (valida
 * stock, descuenta inventario, crea cartera si es crédito) y luego marca la
 * cotización como `facturada` con el `facturaId`. Cantidades en unidad base.
 */
export async function facturarCotizacion(empresaId: number, id: number, datos: DatosFacturarCotizacion, ctx: Contexto): Promise<number> {
  const [c] = await db.select().from(cotizaciones).where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id))).limit(1);
  if (!c) throw new CotizacionInvalida("Cotización no encontrada.");
  if (!puedeFacturar(c.estado)) throw new CotizacionInvalida("Esta cotización ya fue facturada o anulada.");

  // Unidad base de cada producto (la cotización maneja cantidades en base).
  const ids = [...new Set(datos.lineas.map((l) => l.productoId))];
  const prods = await db.select({ id: productos.id, unidadBaseId: productos.unidadBaseId }).from(productos).where(inArray(productos.id, ids));
  const baseDe = new Map(prods.map((p) => [p.id, p.unidadBaseId]));

  const factura = await crearFactura(
    {
      clienteId: c.clienteId,
      bodegaId: datos.bodegaId,
      fecha: datos.fecha,
      tipoVenta: datos.tipoVenta,
      lineas: datos.lineas.map((l) => ({
        productoId: l.productoId,
        unidadId: baseDe.get(l.productoId)!,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
      metodoPago: datos.metodoPago,
      cuentaDestinoId: datos.cuentaDestinoId,
    },
    ctx,
  );

  await db.update(cotizaciones).set({ estado: "facturada", facturaId: factura.id, updatedAt: new Date() }).where(eq(cotizaciones.id, id));
  await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: id, accion: "ACTUALIZAR", registroAnterior: c, registroNuevo: { ...c, estado: "facturada", facturaId: factura.id }, ipOrigen: ctx.ip });
  return factura.id;
}
