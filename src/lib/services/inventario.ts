import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventario,
  movimientosInventario,
  productos,
  bodegas,
  unidadesMedida,
} from "@/lib/db/schema";

export interface FilaInventario {
  id: number;
  productoId: number;
  productoNombre: string;
  productoSku: string;
  bodegaNombre: string;
  unidad: string;
  cantidadActual: string;
  costoPromedio: string;
  valorTotal: string;
}

export async function listarInventario(empresaId: number): Promise<FilaInventario[]> {
  const rows = await db
    .select({
      id: inventario.id,
      productoId: inventario.productoId,
      productoNombre: productos.nombre,
      productoSku: productos.sku,
      bodegaNombre: bodegas.nombre,
      unidad: unidadesMedida.abreviatura,
      cantidadActual: inventario.cantidadActual,
      costoPromedio: inventario.costoPromedio,
      valorTotal: inventario.valorTotal,
    })
    .from(inventario)
    .innerJoin(productos, eq(inventario.productoId, productos.id))
    .innerJoin(bodegas, eq(inventario.bodegaId, bodegas.id))
    .innerJoin(unidadesMedida, eq(productos.unidadBaseId, unidadesMedida.id))
    .where(eq(inventario.empresaId, empresaId))
    .orderBy(productos.nombre);
  return rows;
}

export interface MovimientoKardex {
  id: number;
  fecha: Date;
  tipo: string;
  bodegaNombre: string;
  cantidad: string;
  costoUnitario: string | null;
  referencia: string | null;
}

export async function kardexProducto(
  empresaId: number,
  productoId: number,
): Promise<MovimientoKardex[]> {
  return db
    .select({
      id: movimientosInventario.id,
      fecha: movimientosInventario.fecha,
      tipo: movimientosInventario.tipo,
      bodegaNombre: bodegas.nombre,
      cantidad: movimientosInventario.cantidad,
      costoUnitario: movimientosInventario.costoUnitario,
      referencia: movimientosInventario.referencia,
    })
    .from(movimientosInventario)
    .innerJoin(bodegas, eq(movimientosInventario.bodegaId, bodegas.id))
    .where(
      and(
        eq(movimientosInventario.empresaId, empresaId),
        eq(movimientosInventario.productoId, productoId),
      ),
    )
    .orderBy(desc(movimientosInventario.fecha));
}
