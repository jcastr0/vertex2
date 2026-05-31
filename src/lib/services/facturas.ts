import "server-only";
import { and, eq, ne, desc, count, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  facturas,
  facturaDetalles,
  inventario,
  movimientosInventario,
  movimientosTesoreria,
  cuentasPorCobrar,
  productos,
  productoUnidades,
  terceros,
} from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { cantidadEnBase, precioBaseDesdeUnidad } from "@/lib/domain/conversion";
import { resolverFacturaElectronica } from "@/lib/domain/venta";
import { puedeAnular } from "@/lib/domain/anulacion";
import type { Contexto } from "./bodegas";

export type Factura = typeof facturas.$inferSelect;

export interface LineaVenta {
  productoId: number;
  unidadId: number;
  cantidad: number;
  precioUnitario: number;
}
export interface NuevaFactura {
  clienteId: number;
  bodegaId: number;
  fecha: string;
  tipoVenta: "contado" | "credito";
  lineas: LineaVenta[];
  /** Solo contado: cómo pagó y a qué cuenta entró el dinero. */
  metodoPago?: string;
  cuentaDestinoId?: number;
  /** Factura electrónica. Si se omite, hereda el flag del cliente. */
  esElectronica?: boolean;
}

export class VentaInvalida extends Error {}

export async function listarFacturas(empresaId: number) {
  return db
    .select({ factura: facturas, cliente: terceros.razonSocial })
    .from(facturas)
    .innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .where(eq(facturas.empresaId, empresaId))
    .orderBy(desc(facturas.createdAt));
}

export interface FacturaCliente {
  id: number;
  numero: string;
  fecha: string;
  tipoVenta: string;
  total: number;
  saldo: number;
  esElectronica: boolean;
}

/** Facturas de un cliente con su saldo pendiente (0 si es de contado o ya pagada). */
export async function facturasDeCliente(empresaId: number, clienteId: number): Promise<FacturaCliente[]> {
  const rows = await db
    .select({
      id: facturas.id,
      numero: facturas.numero,
      fecha: facturas.fecha,
      tipoVenta: facturas.tipoVenta,
      total: facturas.total,
      esElectronica: facturas.esElectronica,
      saldo: cuentasPorCobrar.saldoPendiente,
    })
    .from(facturas)
    .leftJoin(cuentasPorCobrar, eq(cuentasPorCobrar.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId), ne(facturas.estado, "anulada")))
    .orderBy(desc(facturas.fecha), desc(facturas.id));
  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    fecha: r.fecha,
    tipoVenta: r.tipoVenta,
    total: Number(r.total),
    saldo: Number(r.saldo ?? 0),
    esElectronica: r.esElectronica,
  }));
}

export async function obtenerFactura(empresaId: number, id: number) {
  const [f] = await db
    .select()
    .from(facturas)
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.id, id)))
    .limit(1);
  if (!f) return null;
  const detalles = await db.select().from(facturaDetalles).where(eq(facturaDetalles.facturaId, id));
  return { ...f, detalles };
}

async function siguienteNumero(empresaId: number): Promise<string> {
  const [{ c }] = await db.select({ c: count() }).from(facturas).where(eq(facturas.empresaId, empresaId));
  return formatearNumero("FAC", Number(c) + 1);
}

/**
 * Crea una factura de venta. Transaccional:
 *  - convierte cada línea a unidad base, valida stock disponible,
 *  - descuenta inventario y registra movimiento de salida (al costo promedio),
 *  - marca líneas con precio por debajo del costo,
 *  - si es a crédito, genera la cuenta por cobrar.
 */
export async function crearFactura(data: NuevaFactura, ctx: Contexto): Promise<Factura> {
  const numero = await siguienteNumero(ctx.empresaId);
  const productoIds = [...new Set(data.lineas.map((l) => l.productoId))];

  const prods = await db
    .select({ id: productos.id, unidadBaseId: productos.unidadBaseId })
    .from(productos)
    .where(inArray(productos.id, productoIds));
  const baseDe = new Map(prods.map((p) => [p.id, p.unidadBaseId]));

  const unidadesProd = await db
    .select()
    .from(productoUnidades)
    .where(inArray(productoUnidades.productoId, productoIds));
  const factorDe = new Map(
    unidadesProd.map((u) => [`${u.productoId}:${u.unidadId}`, Number(u.factorConversion)]),
  );

  const [cli] = await db
    .select({ dias: terceros.diasCreditoCliente, requiereFE: terceros.requiereFacturaElectronica })
    .from(terceros)
    .where(eq(terceros.id, data.clienteId))
    .limit(1);
  const diasCredito = cli?.dias ?? 0;
  const esElectronica = resolverFacturaElectronica(data.esElectronica, cli?.requiereFE ?? false);

  // Pre-cálculo de líneas (factor, base, costo desde inventario actual).
  const preparadas: {
    l: LineaVenta;
    cantidadBase: number;
    costoBase: number;
    lineaSubtotal: number;
    esBajoCosto: boolean;
    invId: number | null;
    disponible: number;
  }[] = [];
  let subtotal = 0;
  for (const l of data.lineas) {
    const esBase = l.unidadId === baseDe.get(l.productoId);
    const factor = esBase ? 1 : factorDe.get(`${l.productoId}:${l.unidadId}`) ?? 1;
    const cantidadBase = cantidadEnBase(l.cantidad, factor);

    const [inv] = await db
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

    const disponible = inv ? Number(inv.cantidadActual) : 0;
    if (cantidadBase > disponible) {
      throw new VentaInvalida(
        `Stock insuficiente para el producto #${l.productoId}: disponible ${disponible}, requerido ${cantidadBase}.`,
      );
    }
    const costoBase = inv ? Number(inv.costoPromedio) : 0;
    const lineaSubtotal = l.cantidad * l.precioUnitario;
    subtotal += lineaSubtotal;
    // Precio por unidad base para comparar contra el costo promedio (por base).
    const precioBase = precioBaseDesdeUnidad(l.precioUnitario, factor || 1);
    preparadas.push({
      l,
      cantidadBase,
      costoBase,
      lineaSubtotal,
      esBajoCosto: precioBase < costoBase,
      invId: inv?.id ?? null,
      disponible,
    });
  }

  const total = subtotal; // impuestos fuera de alcance por ahora

  return db.transaction(async (tx) => {
    const [factura] = await tx
      .insert(facturas)
      .values({
        empresaId: ctx.empresaId,
        bodegaId: data.bodegaId,
        clienteId: data.clienteId,
        numero,
        fecha: data.fecha,
        tipoVenta: data.tipoVenta,
        metodoPago: data.tipoVenta === "contado" ? (data.metodoPago ?? null) : null,
        cuentaDestinoId: data.tipoVenta === "contado" ? (data.cuentaDestinoId ?? null) : null,
        subtotal: String(subtotal),
        impuestos: "0",
        total: String(total),
        estado: "emitida",
        esElectronica,
        usuarioId: ctx.usuarioId,
      })
      .returning();

    for (const p of preparadas) {
      await tx.insert(facturaDetalles).values({
        facturaId: factura.id,
        productoId: p.l.productoId,
        unidadId: p.l.unidadId,
        cantidad: String(p.l.cantidad),
        cantidadBase: String(p.cantidadBase),
        precioUnitario: String(p.l.precioUnitario),
        costoUnitario: String(p.costoBase),
        subtotal: String(p.lineaSubtotal),
        esPrecioBajoCosto: p.esBajoCosto,
      });

      await tx
        .update(productoUnidades)
        .set({ ultimoPrecioVenta: String(p.l.precioUnitario), updatedAt: new Date() })
        .where(and(eq(productoUnidades.productoId, p.l.productoId), eq(productoUnidades.unidadId, p.l.unidadId)));

      const nuevaCant = p.disponible - p.cantidadBase;
      await tx
        .update(inventario)
        .set({
          cantidadActual: String(nuevaCant),
          valorTotal: String(nuevaCant * p.costoBase),
          ultimaActualizacion: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventario.id, p.invId!));

      await tx.insert(movimientosInventario).values({
        empresaId: ctx.empresaId,
        bodegaId: data.bodegaId,
        productoId: p.l.productoId,
        facturaId: factura.id,
        tipo: "salida",
        cantidad: String(p.cantidadBase),
        costoUnitario: String(p.costoBase),
        referencia: numero,
        usuarioId: ctx.usuarioId,
      });
    }

    if (data.tipoVenta === "credito") {
      const venc = new Date(data.fecha);
      venc.setDate(venc.getDate() + diasCredito);
      await tx.insert(cuentasPorCobrar).values({
        empresaId: ctx.empresaId,
        clienteId: data.clienteId,
        facturaId: factura.id,
        fechaFactura: data.fecha,
        fechaVencimiento: venc.toISOString().slice(0, 10),
        valorTotal: String(total),
        saldoPendiente: String(total),
      });
    } else if (data.cuentaDestinoId) {
      // Contado: el dinero entra a la cuenta elegida (tesorería).
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: data.cuentaDestinoId,
        fecha: data.fecha,
        tipo: "entrada",
        origen: "venta",
        valor: String(total),
        descripcion: `Venta ${numero}`,
        facturaId: factura.id,
        usuarioId: ctx.usuarioId,
      });
    }

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx21",
        modelId: factura.id,
        accion: "CREAR",
        registroNuevo: factura,
        ipOrigen: ctx.ip,
      },
      tx,
    );
    return factura;
  });
}

/** Último precio cobrado de cada producto a un cliente (DISTINCT ON por producto, factura más reciente). */
export async function ultimoPrecioPorCliente(empresaId: number, clienteId: number): Promise<Record<number, number>> {
  const rows = await db
    .selectDistinctOn([facturaDetalles.productoId], {
      productoId: facturaDetalles.productoId,
      precio: facturaDetalles.precioUnitario,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId)))
    .orderBy(facturaDetalles.productoId, desc(facturas.fecha), desc(facturas.id));
  return Object.fromEntries(rows.map((r) => [r.productoId, Number(r.precio)]));
}

/** Última venta de cada producto a un cliente: unidad y precio usados. */
export async function ultimaUnidadVentaPorCliente(empresaId: number, clienteId: number): Promise<Record<number, { unidadId: number; precio: number }>> {
  const rows = await db
    .selectDistinctOn([facturaDetalles.productoId], {
      productoId: facturaDetalles.productoId,
      unidadId: facturaDetalles.unidadId,
      precio: facturaDetalles.precioUnitario,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId)))
    .orderBy(facturaDetalles.productoId, desc(facturas.fecha), desc(facturas.id));
  return Object.fromEntries(rows.map((r) => [r.productoId, { unidadId: r.unidadId, precio: Number(r.precio) }]));
}

export class AnulacionInvalida extends Error {}

/** Anula una factura emitida sin cobros: devuelve stock y revierte cartera/caja. */
export async function anularFactura(facturaId: number, motivo: string, ctx: Contexto): Promise<void> {
  const [f] = await db.select().from(facturas).where(and(eq(facturas.empresaId, ctx.empresaId), eq(facturas.id, facturaId))).limit(1);
  if (!f) throw new AnulacionInvalida("Factura no encontrada.");

  // Saldo pendiente (crédito): de la CxC; contado no tiene CxC.
  let saldoPend = Number(f.total);
  let cxcId: number | null = null;
  if (f.tipoVenta === "credito") {
    const [cxc] = await db.select().from(cuentasPorCobrar).where(eq(cuentasPorCobrar.facturaId, facturaId)).limit(1);
    if (cxc) { saldoPend = Number(cxc.saldoPendiente); cxcId = cxc.id; }
  }
  const chk = puedeAnular(f.estado, saldoPend, Number(f.total), f.tipoVenta);
  if (!chk.ok) throw new AnulacionInvalida(chk.motivo!);

  const detalles = await db.select().from(facturaDetalles).where(eq(facturaDetalles.facturaId, facturaId));

  await db.transaction(async (tx) => {
    // 1) Devolver stock
    for (const d of detalles) {
      const [inv] = await tx.select().from(inventario)
        .where(and(eq(inventario.empresaId, ctx.empresaId), eq(inventario.bodegaId, f.bodegaId), eq(inventario.productoId, d.productoId))).limit(1);
      if (inv) {
        const nueva = Number(inv.cantidadActual) + Number(d.cantidadBase);
        const costo = Number(inv.costoPromedio);
        await tx.update(inventario).set({ cantidadActual: String(nueva), valorTotal: String(nueva * costo), ultimaActualizacion: new Date(), updatedAt: new Date() }).where(eq(inventario.id, inv.id));
        await tx.insert(movimientosInventario).values({
          empresaId: ctx.empresaId, bodegaId: f.bodegaId, productoId: d.productoId,
          tipo: "entrada", cantidad: String(d.cantidadBase), costoUnitario: String(d.costoUnitario),
          referencia: `ANULA ${f.numero}`, usuarioId: ctx.usuarioId,
        });
      }
    }
    // 2) Revertir cartera / caja
    if (f.tipoVenta === "credito" && cxcId) {
      await tx.update(cuentasPorCobrar).set({ saldoPendiente: "0", updatedAt: new Date() }).where(eq(cuentasPorCobrar.id, cxcId));
    } else if (f.tipoVenta === "contado" && f.cuentaDestinoId) {
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId, cuentaPropiaId: f.cuentaDestinoId, fecha: f.fecha,
        tipo: "salida", origen: "ajuste", valor: String(f.total),
        descripcion: `Anulación venta ${f.numero}`, facturaId: f.id, usuarioId: ctx.usuarioId,
      });
    }
    // 3) Marcar la factura
    await tx.update(facturas).set({ estado: "anulada", motivoAnulacion: motivo, anuladaEn: new Date(), updatedAt: new Date() }).where(eq(facturas.id, f.id));

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx21", modelId: f.id, accion: "ELIMINAR", registroNuevo: { motivo }, ipOrigen: ctx.ip },
      tx,
    );
  });
}
