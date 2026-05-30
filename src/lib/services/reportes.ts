import "server-only";
import { and, desc, eq, gte, inArray, lte, lt, ne, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  facturas,
  facturaDetalles,
  pedidos,
  inventario,
  cuentasPorCobrar,
  cuentasPorPagar,
  productos,
  bodegas,
  terceros,
  notasInventario,
} from "@/lib/db/schema";

const SUM0 = (col: AnyColumn) => sql<string>`coalesce(sum(${col}), 0)`;

async function suma(query: Promise<{ v: string }[]>): Promise<number> {
  const [r] = await query;
  return Number(r?.v ?? 0);
}

export interface KPIs {
  ventas: number;
  compras: number;
  utilidad: number;
  inventario: number;
  porCobrar: number;
  porPagar: number;
}

/** KPIs del periodo [desde, hasta] (ISO yyyy-mm-dd) para una empresa. */
export async function kpis(empresaId: number, desde: string, hasta: string): Promise<KPIs> {
  const enRango = (col: AnyColumn) => and(gte(col, desde), lte(col, hasta));

  // Consultas de agregación en paralelo (una sola tanda de round-trips).
  const [ventas, compras, costo, inventarioVal, porCobrar, porPagar] = await Promise.all([
    suma(
      db
        .select({ v: SUM0(facturas.total) })
        .from(facturas)
        .where(and(eq(facturas.empresaId, empresaId), ne(facturas.estado, "anulada"), enRango(facturas.fecha))),
    ),
    suma(
      db
        .select({ v: SUM0(pedidos.total) })
        .from(pedidos)
        .where(and(eq(pedidos.empresaId, empresaId), eq(pedidos.estado, "recibido"), enRango(pedidos.fecha))),
    ),
    suma(
      db
        .select({ v: sql<string>`coalesce(sum(${facturaDetalles.cantidadBase} * ${facturaDetalles.costoUnitario}), 0)` })
        .from(facturaDetalles)
        .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
        .where(and(eq(facturas.empresaId, empresaId), ne(facturas.estado, "anulada"), enRango(facturas.fecha))),
    ),
    suma(db.select({ v: SUM0(inventario.valorTotal) }).from(inventario).where(eq(inventario.empresaId, empresaId))),
    suma(
      db.select({ v: SUM0(cuentasPorCobrar.saldoPendiente) }).from(cuentasPorCobrar).where(eq(cuentasPorCobrar.empresaId, empresaId)),
    ),
    suma(
      db.select({ v: SUM0(cuentasPorPagar.saldoPendiente) }).from(cuentasPorPagar).where(eq(cuentasPorPagar.empresaId, empresaId)),
    ),
  ]);

  return { ventas, compras, utilidad: ventas - costo, inventario: inventarioVal, porCobrar, porPagar };
}

export interface FilaStockBajo {
  productoId: number;
  producto: string;
  bodega: string;
  cantidad: string;
  minimo: string;
}

/** Productos por debajo de su stock mínimo. */
export async function stockBajo(empresaId: number): Promise<FilaStockBajo[]> {
  return db
    .select({
      productoId: productos.id,
      producto: productos.nombre,
      bodega: bodegas.nombre,
      cantidad: inventario.cantidadActual,
      minimo: productos.stockMinimo,
    })
    .from(inventario)
    .innerJoin(productos, eq(inventario.productoId, productos.id))
    .innerJoin(bodegas, eq(inventario.bodegaId, bodegas.id))
    .where(
      and(
        eq(inventario.empresaId, empresaId),
        gte(productos.stockMinimo, "0.0001"),
        sql`${inventario.cantidadActual} < ${productos.stockMinimo}`,
      ),
    )
    .orderBy(productos.nombre);
}

export interface FilaVencida {
  id: number;
  cliente: string;
  fechaVencimiento: string;
  saldo: string;
}

/** Cuentas por cobrar vencidas (saldo > 0 y vencimiento < hoy). */
export async function cxcVencidas(empresaId: number, hoy: string): Promise<FilaVencida[]> {
  return db
    .select({
      id: cuentasPorCobrar.id,
      cliente: terceros.razonSocial,
      fechaVencimiento: cuentasPorCobrar.fechaVencimiento,
      saldo: cuentasPorCobrar.saldoPendiente,
    })
    .from(cuentasPorCobrar)
    .innerJoin(terceros, eq(cuentasPorCobrar.clienteId, terceros.id))
    .where(
      and(
        eq(cuentasPorCobrar.empresaId, empresaId),
        sql`${cuentasPorCobrar.saldoPendiente} > 0`,
        lt(cuentasPorCobrar.fechaVencimiento, hoy),
      ),
    )
    .orderBy(cuentasPorCobrar.fechaVencimiento);
}

/** Novedades (faltante/merma/daño) por proveedor: cuántas y cuánta cantidad. */
export async function novedadesPorProveedor(empresaId: number) {
  const rows = await db
    .select({
      proveedorId: notasInventario.proveedorId,
      proveedor: terceros.razonSocial,
      tipo: notasInventario.tipo,
      novedades: sql<string>`count(*)`,
      cantidad: sql<string>`sum(${notasInventario.cantidad})`,
    })
    .from(notasInventario)
    .innerJoin(terceros, eq(notasInventario.proveedorId, terceros.id))
    .where(and(eq(notasInventario.empresaId, empresaId), inArray(notasInventario.tipo, ["diferencia_negativa", "merma", "dano"])))
    .groupBy(notasInventario.proveedorId, terceros.razonSocial, notasInventario.tipo)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({
    proveedorId: r.proveedorId,
    proveedor: r.proveedor,
    tipo: r.tipo,
    novedades: Number(r.novedades),
    cantidad: Number(r.cantidad),
  }));
}
