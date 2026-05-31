// src/lib/services/reportes/inventario.ts
import "server-only";
import { and, eq, ne, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventario, productos, categoriasProductos, facturaDetalles, facturas } from "@/lib/db/schema";
import { margenPorc } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarInventario(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const condInv = and(
    eq(inventario.empresaId, empresaId),
    f.bodega ? eq(inventario.bodegaId, Number(f.bodega)) : undefined,
  );
  // Existencia/valor por producto
  const inv = await db
    .select({
      productoId: productos.id, producto: productos.nombre, categoria: categoriasProductos.nombre, categoriaId: productos.categoriaId,
      existencia: sql<string>`coalesce(sum(${inventario.cantidadActual}), 0)`,
      costoProm: sql<string>`coalesce(avg(${inventario.costoPromedio}), 0)`,
      valor: sql<string>`coalesce(sum(${inventario.valorTotal}), 0)`,
    })
    .from(inventario)
    .innerJoin(productos, eq(inventario.productoId, productos.id))
    .leftJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
    .where(and(condInv, f.categoria ? eq(productos.categoriaId, Number(f.categoria)) : undefined))
    .groupBy(productos.id, productos.nombre, categoriasProductos.nombre, productos.categoriaId);

  // Vendido + margen del periodo por producto
  const vend = await db
    .select({
      productoId: facturaDetalles.productoId,
      unidades: sql<string>`sum(${facturaDetalles.cantidadBase})`,
      ventas: sql<string>`sum(${facturaDetalles.subtotal})`,
      costo: sql<string>`sum(${facturaDetalles.costoUnitario} * ${facturaDetalles.cantidadBase})`,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), ne(facturas.estado, "cancelada"), gte(facturas.fecha, f.desde!), lte(facturas.fecha, f.hasta!)))
    .groupBy(facturaDetalles.productoId);
  const vendPorProd = new Map(vend.map((v) => [v.productoId, v]));

  const filas = inv.map((p) => {
    const v = vendPorProd.get(p.productoId);
    const ventas = Number(v?.ventas ?? 0);
    const costo = Number(v?.costo ?? 0);
    const margen = ventas - costo;
    return {
      ...p, existencia: Number(p.existencia), costoProm: Number(p.costoProm), valor: Number(p.valor),
      vendido: Number(v?.unidades ?? 0), margen, margenPct: margenPorc(ventas, costo),
    };
  });

  const valorTotal = filas.reduce((a, r) => a + r.valor, 0);
  const margenProm = filas.length ? filas.reduce((a, r) => a + r.margenPct, 0) / filas.filter((r) => r.vendido > 0).length || 0 : 0;

  const porCategoria = Object.values(filas.reduce<Record<string, { etiqueta: string; x: string; y: number }>>((acc, r) => {
    const k = r.categoria ?? "Sin categoría";
    (acc[k] ??= { etiqueta: k, x: k, y: 0 }).y += r.valor; return acc;
  }, {})).sort((a, b) => b.y - a.y);

  const margenPorCat = Object.values(filas.reduce<Record<string, { etiqueta: string; x: string; y: number }>>((acc, r) => {
    const k = r.categoria ?? "Sin categoría";
    (acc[k] ??= { etiqueta: k, x: k, y: 0 }).y += r.margen; return acc;
  }, {})).sort((a, b) => b.y - a.y);

  return {
    kpis: [
      { label: "Inventario valorizado", valor: valorTotal, formato: "money" },
      { label: "# Productos", valor: filas.length, formato: "num" },
      { label: "Margen del periodo", valor: filas.reduce((a, r) => a + r.margen, 0), formato: "money" },
      { label: "Margen promedio", valor: isFinite(margenProm) ? margenProm : 0, formato: "pct" },
    ],
    series: {
      valorPorCategoria: porCategoria,
      margenPorCategoria: margenPorCat,
      // dispersión: unidades vendidas (x) vs margen% (y)
      margenVsRotacion: filas.filter((r) => r.vendido > 0).map((r) => ({ x: r.vendido, y: r.margenPct, etiqueta: r.producto })),
    },
    detalle: {
      columnas: [
        { header: "Producto", tipo: "texto" }, { header: "Categoría", tipo: "texto" },
        { header: "Existencia", tipo: "num" }, { header: "Costo prom.", tipo: "money" },
        { header: "Valor", tipo: "money", total: true }, { header: "Vendido", tipo: "num" },
        { header: "Margen $", tipo: "money", total: true }, { header: "Margen %", tipo: "num" },
      ],
      filas: filas.sort((a, b) => b.valor - a.valor).map((r) => [r.producto, r.categoria ?? "—", r.existencia, r.costoProm, r.valor, r.vendido, r.margen, Number(r.margenPct.toFixed(1))]),
    },
  };
}

export async function filtrosInventario(empresaId: number) {
  const cats = await db.select({ value: categoriasProductos.id, label: categoriasProductos.nombre }).from(categoriasProductos)
    .where(and(eq(categoriasProductos.empresaId, empresaId), eq(categoriasProductos.tipo, "producto"))).orderBy(categoriasProductos.nombre);
  return cats.map((c) => ({ value: String(c.value), label: c.label }));
}
