import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventario, productos, bodegas, unidadesMedida, movimientosInventario,
  facturas, facturaDetalles, pedidos, pedidoDetalles, notasInventario,
} from "@/lib/db/schema";
import { obtenerBodega, type Bodega } from "./bodegas";
import { obtenerProducto, type Producto } from "./productos";

/** Resumen de inventario de una bodega a partir de las existencias de sus productos. Puro. */
export function resumenInventarioBodega(
  filas: { existencia: number; valor: number }[],
): { productosDistintos: number; sinExistencia: number; valorInventario: number } {
  let productosDistintos = 0;
  let sinExistencia = 0;
  let valorInventario = 0;
  for (const f of filas) {
    if (f.existencia > 0) productosDistintos++;
    else sinExistencia++;
    valorInventario += f.valor;
  }
  return { productosDistintos, sinExistencia, valorInventario };
}

export interface FichaBodegaProducto {
  productoId: number; nombre: string; sku: string; unidad: string;
  existencia: number; costoPromedio: number; valor: number;
}
export interface FichaBodegaMovimiento {
  id: number; fecha: Date; tipo: string; productoNombre: string; cantidad: number; referencia: string | null;
}
export interface FichaBodega {
  bodega: Bodega;
  productosDistintos: number; sinExistencia: number; valorInventario: number;
  productos: FichaBodegaProducto[];
  ultimosMovimientos: FichaBodegaMovimiento[];
}

export async function fichaBodega(empresaId: number, bodegaId: number): Promise<FichaBodega | null> {
  const bodega = await obtenerBodega(empresaId, bodegaId);
  if (!bodega) return null;

  // Consultas independientes en paralelo (existencias y movimientos no dependen entre sí).
  const [filas, movs] = await Promise.all([
    db
      .select({
        productoId: inventario.productoId, nombre: productos.nombre, sku: productos.sku,
        unidad: unidadesMedida.abreviatura, existencia: inventario.cantidadActual,
        costoPromedio: inventario.costoPromedio, valor: inventario.valorTotal,
      })
      .from(inventario)
      .innerJoin(productos, eq(inventario.productoId, productos.id))
      .innerJoin(unidadesMedida, eq(productos.unidadBaseId, unidadesMedida.id))
      .where(and(eq(inventario.empresaId, empresaId), eq(inventario.bodegaId, bodegaId)))
      .orderBy(desc(inventario.valorTotal)),
    db
      .select({
        id: movimientosInventario.id, fecha: movimientosInventario.fecha, tipo: movimientosInventario.tipo,
        productoNombre: productos.nombre, cantidad: movimientosInventario.cantidad, referencia: movimientosInventario.referencia,
      })
      .from(movimientosInventario)
      .innerJoin(productos, eq(movimientosInventario.productoId, productos.id))
      .where(and(eq(movimientosInventario.empresaId, empresaId), eq(movimientosInventario.bodegaId, bodegaId)))
      .orderBy(desc(movimientosInventario.fecha))
      .limit(10),
  ]);

  const productosFicha: FichaBodegaProducto[] = filas.map((f) => ({
    productoId: f.productoId, nombre: f.nombre, sku: f.sku, unidad: f.unidad,
    existencia: Number(f.existencia ?? 0), costoPromedio: Number(f.costoPromedio ?? 0), valor: Number(f.valor ?? 0),
  }));

  const resumen = resumenInventarioBodega(productosFicha.map((p) => ({ existencia: p.existencia, valor: p.valor })));

  return {
    bodega,
    productosDistintos: resumen.productosDistintos, sinExistencia: resumen.sinExistencia, valorInventario: resumen.valorInventario,
    productos: productosFicha,
    ultimosMovimientos: movs.map((m) => ({
      id: m.id, fecha: m.fecha, tipo: m.tipo, productoNombre: m.productoNombre,
      cantidad: Number(m.cantidad ?? 0), referencia: m.referencia,
    })),
  };
}

const u30 = sql`now() - interval '30 days'`;

export interface KpiPeriodo { total: number; ultimos30: number }
export interface FichaProductoExistencia { bodegaId: number; bodegaNombre: string; existencia: number; valor: number }
export interface FichaProductoMerma { id: number; fecha: Date; bodegaNombre: string; cantidad: number; motivo: string }
export interface FichaProducto {
  producto: Producto;
  vendidoCantidad: KpiPeriodo; vendidoMonto: KpiPeriodo; compradoCantidad: KpiPeriodo; mermaCantidad: KpiPeriodo;
  stockTotal: number;
  existencias: FichaProductoExistencia[];
  pedidosDistintos: number; cantidadRecibida: number;
  mermas: FichaProductoMerma[];
}

export async function fichaProducto(empresaId: number, productoId: number): Promise<FichaProducto | null> {
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) return null;

  // Las cinco consultas son independientes (solo dependen de empresaId/productoId) → en paralelo.
  const [ventaRows, compraRows, mermaRows, exist, mermasDet] = await Promise.all([
    db
      .select({
        cantTotal: sql<string>`coalesce(sum(${facturaDetalles.cantidadBase}), 0)`,
        cant30: sql<string>`coalesce(sum(case when ${facturas.fecha} >= ${u30} then ${facturaDetalles.cantidadBase} else 0 end), 0)`,
        montoTotal: sql<string>`coalesce(sum(${facturaDetalles.subtotal}), 0)`,
        monto30: sql<string>`coalesce(sum(case when ${facturas.fecha} >= ${u30} then ${facturaDetalles.subtotal} else 0 end), 0)`,
      })
      .from(facturaDetalles)
      .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
      .where(and(eq(facturas.empresaId, empresaId), eq(facturaDetalles.productoId, productoId), eq(facturas.estado, "emitida"))),
    db
      .select({
        cantTotal: sql<string>`coalesce(sum(${pedidoDetalles.cantidad}), 0)`,
        cant30: sql<string>`coalesce(sum(case when ${pedidos.fecha} >= ${u30} then ${pedidoDetalles.cantidad} else 0 end), 0)`,
        recibida: sql<string>`coalesce(sum(${pedidoDetalles.cantidadRecibida}), 0)`,
        pedidos: sql<string>`count(distinct ${pedidoDetalles.pedidoId})`,
      })
      .from(pedidoDetalles)
      .innerJoin(pedidos, eq(pedidoDetalles.pedidoId, pedidos.id))
      .where(and(eq(pedidos.empresaId, empresaId), eq(pedidoDetalles.productoId, productoId))),
    db
      .select({
        total: sql<string>`coalesce(sum(${notasInventario.cantidad}), 0)`,
        u30: sql<string>`coalesce(sum(case when ${notasInventario.fecha} >= ${u30} then ${notasInventario.cantidad} else 0 end), 0)`,
      })
      .from(notasInventario)
      .where(and(eq(notasInventario.empresaId, empresaId), eq(notasInventario.productoId, productoId), eq(notasInventario.tipo, "salida"))),
    db
      .select({ bodegaId: inventario.bodegaId, bodegaNombre: bodegas.nombre, existencia: inventario.cantidadActual, valor: inventario.valorTotal })
      .from(inventario)
      .innerJoin(bodegas, eq(inventario.bodegaId, bodegas.id))
      .where(and(eq(inventario.empresaId, empresaId), eq(inventario.productoId, productoId)))
      .orderBy(desc(inventario.cantidadActual)),
    db
      .select({ id: notasInventario.id, fecha: notasInventario.fecha, bodegaNombre: bodegas.nombre, cantidad: notasInventario.cantidad, motivo: notasInventario.motivo })
      .from(notasInventario)
      .innerJoin(bodegas, eq(notasInventario.bodegaId, bodegas.id))
      .where(and(eq(notasInventario.empresaId, empresaId), eq(notasInventario.productoId, productoId), eq(notasInventario.tipo, "salida")))
      .orderBy(desc(notasInventario.fecha))
      .limit(5),
  ]);
  const [venta] = ventaRows;
  const [compra] = compraRows;
  const [merma] = mermaRows;

  const existencias = exist.map((x) => ({ bodegaId: x.bodegaId, bodegaNombre: x.bodegaNombre, existencia: Number(x.existencia ?? 0), valor: Number(x.valor ?? 0) }));

  return {
    producto,
    vendidoCantidad: { total: Number(venta.cantTotal), ultimos30: Number(venta.cant30) },
    vendidoMonto: { total: Number(venta.montoTotal), ultimos30: Number(venta.monto30) },
    compradoCantidad: { total: Number(compra.cantTotal), ultimos30: Number(compra.cant30) },
    mermaCantidad: { total: Number(merma.total), ultimos30: Number(merma.u30) },
    stockTotal: existencias.reduce((s, x) => s + x.existencia, 0),
    existencias,
    pedidosDistintos: Number(compra.pedidos),
    cantidadRecibida: Number(compra.recibida),
    mermas: mermasDet.map((m) => ({ id: m.id, fecha: m.fecha, bodegaNombre: m.bodegaNombre, cantidad: Number(m.cantidad ?? 0), motivo: m.motivo })),
  };
}
