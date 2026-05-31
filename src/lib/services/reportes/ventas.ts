// src/lib/services/reportes/ventas.ts
import "server-only";
import { and, eq, ne, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturas, facturaDetalles, terceros, productos } from "@/lib/db/schema";
import { ticketPromedio } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarVentas(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(
    eq(facturas.empresaId, empresaId),
    ne(facturas.estado, "cancelada"),
    gte(facturas.fecha, f.desde!),
    lte(facturas.fecha, f.hasta!),
    f.cliente ? eq(facturas.clienteId, Number(f.cliente)) : undefined,
    f.bodega ? eq(facturas.bodegaId, Number(f.bodega)) : undefined,
    f.tipoVenta ? eq(facturas.tipoVenta, f.tipoVenta) : undefined,
  );

  // KPIs
  const [tot] = await db
    .select({
      ventas: sql<string>`coalesce(sum(${facturas.total}), 0)`,
      n: sql<number>`count(*)`,
      credito: sql<string>`coalesce(sum(case when ${facturas.tipoVenta} = 'credito' then ${facturas.total} else 0 end), 0)`,
    })
    .from(facturas)
    .where(cond);
  const ventas = Number(tot?.ventas ?? 0);
  const nFac = Number(tot?.n ?? 0);
  const credito = Number(tot?.credito ?? 0);

  // Serie: ventas por día
  const porDia = await db
    .select({ x: facturas.fecha, y: sql<string>`sum(${facturas.total})` })
    .from(facturas).where(cond).groupBy(facturas.fecha).orderBy(facturas.fecha);

  // Top clientes
  const topCli = await db
    .select({ etiqueta: terceros.razonSocial, y: sql<string>`sum(${facturas.total})` })
    .from(facturas).innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .where(cond).groupBy(terceros.razonSocial).orderBy(desc(sql`sum(${facturas.total})`)).limit(10);

  // Top productos (por líneas de las facturas del filtro)
  const condDet = and(eq(facturas.empresaId, empresaId), ne(facturas.estado, "cancelada"), gte(facturas.fecha, f.desde!), lte(facturas.fecha, f.hasta!),
    f.cliente ? eq(facturas.clienteId, Number(f.cliente)) : undefined,
    f.bodega ? eq(facturas.bodegaId, Number(f.bodega)) : undefined,
    f.tipoVenta ? eq(facturas.tipoVenta, f.tipoVenta) : undefined);
  const topProd = await db
    .select({ etiqueta: productos.nombre, y: sql<string>`sum(${facturaDetalles.subtotal})` })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .innerJoin(productos, eq(facturaDetalles.productoId, productos.id))
    .where(condDet).groupBy(productos.nombre).orderBy(desc(sql`sum(${facturaDetalles.subtotal})`)).limit(10);

  // Detalle: líneas de venta
  const det = await db
    .select({
      fecha: facturas.fecha, numero: facturas.numero, cliente: terceros.razonSocial,
      producto: productos.nombre, cantidad: facturaDetalles.cantidad,
      precio: facturaDetalles.precioUnitario, total: facturaDetalles.subtotal,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .innerJoin(productos, eq(facturaDetalles.productoId, productos.id))
    .where(condDet).orderBy(desc(facturas.fecha), facturas.numero);

  return {
    kpis: [
      { label: "Ventas totales", valor: ventas, formato: "money" },
      { label: "# Facturas", valor: nFac, formato: "num" },
      { label: "Ticket promedio", valor: ticketPromedio(ventas, nFac), formato: "money" },
      { label: "% a crédito", valor: ventas > 0 ? (credito / ventas) * 100 : 0, formato: "pct" },
    ],
    series: {
      porDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      topProductos: topProd.map((r) => ({ x: r.etiqueta, y: Number(r.y), etiqueta: r.etiqueta })),
      topClientes: topCli.map((r) => ({ x: r.etiqueta, y: Number(r.y), etiqueta: r.etiqueta })),
      contadoCredito: [
        { x: "Contado", y: ventas - credito, etiqueta: "Contado" },
        { x: "Crédito", y: credito, etiqueta: "Crédito" },
      ],
    },
    detalle: {
      columnas: [
        { header: "Fecha", tipo: "fecha" }, { header: "Factura", tipo: "texto" },
        { header: "Cliente", tipo: "texto" }, { header: "Producto", tipo: "texto" },
        { header: "Cantidad", tipo: "num" }, { header: "Precio", tipo: "money" },
        { header: "Total", tipo: "money", total: true },
      ],
      filas: det.map((r) => [r.fecha, r.numero, r.cliente, r.producto, Number(r.cantidad), Number(r.precio), Number(r.total)]),
    },
  };
}

/** Opciones de filtros (clientes y bodegas activos). */
export async function filtrosVentas(empresaId: number) {
  const cli = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros)
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return cli.map((c) => ({ value: String(c.value), label: c.label }));
}
