// src/lib/services/reportes/compras.ts
import "server-only";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pedidos, pedidoCostos, terceros } from "@/lib/db/schema";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const RECIBIDO = sql`${pedidos.estado} in ('recibido','parcial')`;

export async function cargarCompras(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(eq(pedidos.empresaId, empresaId), RECIBIDO, gte(pedidos.fecha, f.desde!), lte(pedidos.fecha, f.hasta!),
    f.proveedor ? eq(pedidos.proveedorId, Number(f.proveedor)) : undefined);
  const [tot] = await db.select({ compras: sql<string>`coalesce(sum(${pedidos.total}),0)`, n: sql<number>`count(*)`, costos: sql<string>`coalesce(sum(${pedidos.costosAdicionales}),0)` }).from(pedidos).where(cond);
  const porDia = await db.select({ x: pedidos.fecha, y: sql<string>`sum(${pedidos.total})` }).from(pedidos).where(cond).groupBy(pedidos.fecha).orderBy(pedidos.fecha);
  const topProv = await db.select({ etiqueta: terceros.razonSocial, y: sql<string>`sum(${pedidos.total})` }).from(pedidos).innerJoin(terceros, eq(pedidos.proveedorId, terceros.id)).where(cond).groupBy(terceros.razonSocial).orderBy(desc(sql`sum(${pedidos.total})`)).limit(10);
  const costos = await db.select({ etiqueta: pedidoCostos.tipo, y: sql<string>`sum(${pedidoCostos.valor})` }).from(pedidoCostos).innerJoin(pedidos, eq(pedidoCostos.pedidoId, pedidos.id)).where(cond).groupBy(pedidoCostos.tipo).orderBy(desc(sql`sum(${pedidoCostos.valor})`));
  const det = await db.select({ fecha: pedidos.fecha, numero: pedidos.numero, proveedor: terceros.razonSocial, estado: pedidos.estado, total: pedidos.total }).from(pedidos).innerJoin(terceros, eq(pedidos.proveedorId, terceros.id)).where(cond).orderBy(desc(pedidos.fecha));

  return {
    kpis: [
      { label: "Compras", valor: Number(tot?.compras ?? 0), formato: "money" },
      { label: "# Pedidos", valor: Number(tot?.n ?? 0), formato: "num" },
      { label: "Costos adicionales", valor: Number(tot?.costos ?? 0), formato: "money" },
      { label: "Promedio por pedido", valor: Number(tot?.n ?? 0) > 0 ? Number(tot?.compras ?? 0) / Number(tot?.n ?? 0) : 0, formato: "money" },
    ],
    series: {
      porDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      topProveedores: topProv.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
      costos: costos.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
    },
    detalle: {
      columnas: [{ header: "Fecha", tipo: "fecha" }, { header: "Pedido", tipo: "texto" }, { header: "Proveedor", tipo: "texto" }, { header: "Estado", tipo: "texto" }, { header: "Total", tipo: "money", total: true }],
      filas: det.map((r) => [r.fecha, r.numero, r.proveedor, r.estado, Number(r.total)]),
    },
  };
}

export async function filtrosCompras(empresaId: number) {
  const provs = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros).where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return provs.map((p) => ({ value: String(p.value), label: p.label }));
}
