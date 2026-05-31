import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventario, productos, bodegas, unidadesMedida, movimientosInventario } from "@/lib/db/schema";
import { obtenerBodega, type Bodega } from "./bodegas";

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

  const filas = await db
    .select({
      productoId: inventario.productoId, nombre: productos.nombre, sku: productos.sku,
      unidad: unidadesMedida.abreviatura, existencia: inventario.cantidadActual,
      costoPromedio: inventario.costoPromedio, valor: inventario.valorTotal,
    })
    .from(inventario)
    .innerJoin(productos, eq(inventario.productoId, productos.id))
    .innerJoin(unidadesMedida, eq(productos.unidadBaseId, unidadesMedida.id))
    .where(and(eq(inventario.empresaId, empresaId), eq(inventario.bodegaId, bodegaId)))
    .orderBy(desc(inventario.valorTotal));

  const productosFicha: FichaBodegaProducto[] = filas.map((f) => ({
    productoId: f.productoId, nombre: f.nombre, sku: f.sku, unidad: f.unidad,
    existencia: Number(f.existencia ?? 0), costoPromedio: Number(f.costoPromedio ?? 0), valor: Number(f.valor ?? 0),
  }));

  const resumen = resumenInventarioBodega(productosFicha.map((p) => ({ existencia: p.existencia, valor: p.valor })));

  const movs = await db
    .select({
      id: movimientosInventario.id, fecha: movimientosInventario.fecha, tipo: movimientosInventario.tipo,
      productoNombre: productos.nombre, cantidad: movimientosInventario.cantidad, referencia: movimientosInventario.referencia,
    })
    .from(movimientosInventario)
    .innerJoin(productos, eq(movimientosInventario.productoId, productos.id))
    .where(and(eq(movimientosInventario.empresaId, empresaId), eq(movimientosInventario.bodegaId, bodegaId)))
    .orderBy(desc(movimientosInventario.fecha))
    .limit(10);

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
