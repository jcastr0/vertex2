import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { TIPOS_NOTA } from "@/lib/domain/nota-inventario";
import {
  inventario, productos, bodegas, unidadesMedida, movimientosInventario,
  facturas, facturaDetalles, pedidos, pedidoDetalles, notasInventario, terceros,
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
  facturaId: number | null; pedidoId: number | null; trasladoId: number | null;
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
        facturaId: movimientosInventario.facturaId, pedidoId: movimientosInventario.pedidoId, trasladoId: movimientosInventario.trasladoId,
      })
      .from(movimientosInventario)
      .innerJoin(productos, eq(movimientosInventario.productoId, productos.id))
      .where(and(eq(movimientosInventario.empresaId, empresaId), eq(movimientosInventario.bodegaId, bodegaId)))
      .orderBy(desc(movimientosInventario.fecha)),
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
      facturaId: m.facturaId, pedidoId: m.pedidoId, trasladoId: m.trasladoId,
    })),
  };
}

const u30 = sql`now() - interval '30 days'`;

/** Tipos de nota que RESTAN existencias (merma, daño, faltantes y ajustes de salida). */
const TIPOS_SALIDA = TIPOS_NOTA.filter((t) => t.signo === -1).map((t) => t.value);

export interface KpiPeriodo { total: number; ultimos30: number }
export interface FichaProductoExistencia { bodegaId: number; bodegaNombre: string; existencia: number; valor: number }
export interface FichaProductoMerma { id: number; fecha: Date; bodegaNombre: string; cantidad: number; motivo: string }
/**
 * Reconciliación del stock desde el kardex (la verdad de las existencias):
 * `inicial + entradas − salidas = stock`. Siempre cuadra. `inicial` es la
 * existencia inicial (o ajuste no registrado como movimiento) = stock − entradas + salidas.
 */
export interface ReconciliacionStock { inicial: number; entradas: number; salidas: number; stock: number }
export interface FichaProducto {
  producto: Producto;
  vendidoCantidad: KpiPeriodo; vendidoMonto: KpiPeriodo; compradoCantidad: KpiPeriodo; mermaCantidad: KpiPeriodo;
  stockTotal: number;
  existencias: FichaProductoExistencia[];
  pedidosDistintos: number; cantidadRecibida: number;
  mermas: FichaProductoMerma[];
  reconciliacion: ReconciliacionStock;
}

export async function fichaProducto(empresaId: number, productoId: number): Promise<FichaProducto | null> {
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) return null;

  // Consultas independientes (solo dependen de empresaId/productoId) → en paralelo.
  const [ventaRows, compraRows, mermaRows, exist, mermasDet, kardexRows] = await Promise.all([
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
      .where(and(eq(notasInventario.empresaId, empresaId), eq(notasInventario.productoId, productoId), inArray(notasInventario.tipo, TIPOS_SALIDA))),
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
      .where(and(eq(notasInventario.empresaId, empresaId), eq(notasInventario.productoId, productoId), inArray(notasInventario.tipo, TIPOS_SALIDA)))
      .orderBy(desc(notasInventario.fecha)),
    // Kardex: entradas y salidas reales (con su signo) — la verdad del stock.
    db
      .select({
        entradas: sql<string>`coalesce(sum(case when ${movimientosInventario.tipo} in ('entrada','traslado_entrada') then ${movimientosInventario.cantidad} when ${movimientosInventario.tipo} = 'ajuste' and ${movimientosInventario.cantidad} > 0 then ${movimientosInventario.cantidad} else 0 end), 0)`,
        salidas: sql<string>`coalesce(sum(case when ${movimientosInventario.tipo} in ('salida','traslado_salida') then ${movimientosInventario.cantidad} when ${movimientosInventario.tipo} = 'ajuste' and ${movimientosInventario.cantidad} < 0 then -${movimientosInventario.cantidad} else 0 end), 0)`,
      })
      .from(movimientosInventario)
      .where(and(eq(movimientosInventario.empresaId, empresaId), eq(movimientosInventario.productoId, productoId))),
  ]);
  const [venta] = ventaRows;
  const [compra] = compraRows;
  const [merma] = mermaRows;
  const [kardex] = kardexRows;

  const existencias = exist.map((x) => ({ bodegaId: x.bodegaId, bodegaNombre: x.bodegaNombre, existencia: Number(x.existencia ?? 0), valor: Number(x.valor ?? 0) }));
  const stockTotal = existencias.reduce((s, x) => s + x.existencia, 0);

  // Reconciliación: stock = inicial + entradas − salidas. `inicial` = lo que el
  // kardex no explica (existencia inicial / ajustes). Siempre cuadra por construcción.
  const entradas = Number(kardex.entradas);
  const salidas = Number(kardex.salidas);
  const redondear = (n: number) => Math.round(n * 10000) / 10000;
  const inicial = redondear(stockTotal - entradas + salidas);

  return {
    producto,
    vendidoCantidad: { total: Number(venta.cantTotal), ultimos30: Number(venta.cant30) },
    vendidoMonto: { total: Number(venta.montoTotal), ultimos30: Number(venta.monto30) },
    compradoCantidad: { total: Number(compra.cantTotal), ultimos30: Number(compra.cant30) },
    mermaCantidad: { total: Number(merma.total), ultimos30: Number(merma.u30) },
    stockTotal,
    existencias,
    pedidosDistintos: Number(compra.pedidos),
    cantidadRecibida: Number(compra.recibida),
    mermas: mermasDet.map((m) => ({ id: m.id, fecha: m.fecha, bodegaNombre: m.bodegaNombre, cantidad: Number(m.cantidad ?? 0), motivo: m.motivo })),
    reconciliacion: { inicial, entradas: redondear(entradas), salidas: redondear(salidas), stock: stockTotal },
  };
}

// ── Drill-down: el detalle detrás de cada cifra del producto ────────────────

export interface VentaDeProducto { facturaId: number; numero: string; fecha: string; cliente: string; cantidad: number; subtotal: number }
export interface CompraDeProducto { pedidoId: number; numero: string; fecha: string; proveedor: string; cantidad: number; recibida: number; subtotal: number }

/** Las facturas (emitidas) donde se vendió este producto. La suma reconstruye "Vendido". */
export async function ventasDeProducto(empresaId: number, productoId: number): Promise<VentaDeProducto[]> {
  const rows = await db
    .select({
      facturaId: facturas.id,
      numero: facturas.numero,
      fecha: facturas.fecha,
      cliente: terceros.razonSocial,
      cantidad: sql<string>`sum(${facturaDetalles.cantidadBase})`,
      subtotal: sql<string>`sum(${facturaDetalles.subtotal})`,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturaDetalles.productoId, productoId), eq(facturas.estado, "emitida")))
    .groupBy(facturas.id, facturas.numero, facturas.fecha, terceros.razonSocial)
    .orderBy(desc(facturas.fecha), desc(facturas.id));
  return rows.map((r) => ({ ...r, cantidad: Number(r.cantidad), subtotal: Number(r.subtotal) }));
}

/** Los pedidos donde se compró este producto. La suma reconstruye "Comprado". */
export async function comprasDeProducto(empresaId: number, productoId: number): Promise<CompraDeProducto[]> {
  const rows = await db
    .select({
      pedidoId: pedidos.id,
      numero: pedidos.numero,
      fecha: pedidos.fecha,
      proveedor: terceros.razonSocial,
      cantidad: sql<string>`sum(${pedidoDetalles.cantidad})`,
      recibida: sql<string>`sum(${pedidoDetalles.cantidadRecibida})`,
      subtotal: sql<string>`sum(${pedidoDetalles.subtotal})`,
    })
    .from(pedidoDetalles)
    .innerJoin(pedidos, eq(pedidoDetalles.pedidoId, pedidos.id))
    .innerJoin(terceros, eq(pedidos.proveedorId, terceros.id))
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidoDetalles.productoId, productoId)))
    .groupBy(pedidos.id, pedidos.numero, pedidos.fecha, terceros.razonSocial)
    .orderBy(desc(pedidos.fecha), desc(pedidos.id));
  return rows.map((r) => ({ ...r, cantidad: Number(r.cantidad), recibida: Number(r.recibida), subtotal: Number(r.subtotal) }));
}
