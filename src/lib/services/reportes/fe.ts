// src/lib/services/reportes/fe.ts
import "server-only";
import { and, eq, ne, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturas, terceros, pagosProveedor, cuentasPorPagar } from "@/lib/db/schema";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarFE(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const condV = and(eq(facturas.empresaId, empresaId), eq(facturas.esElectronica, true), ne(facturas.estado, "anulada"), gte(facturas.fecha, f.desde!), lte(facturas.fecha, f.hasta!));
  const [v] = await db.select({ total: sql<string>`coalesce(sum(${facturas.total}),0)`, n: sql<number>`count(*)` }).from(facturas).where(condV);
  const ventasDia = await db.select({ x: facturas.fecha, y: sql<string>`sum(${facturas.total})` }).from(facturas).where(condV).groupBy(facturas.fecha).orderBy(facturas.fecha);

  // Compras F.E. (pagos de CxP electrónicas) + retención total
  const condC = and(eq(pagosProveedor.empresaId, empresaId), eq(cuentasPorPagar.esElectronica, true), gte(pagosProveedor.fecha, f.desde!), lte(pagosProveedor.fecha, f.hasta!));
  const [c] = await db.select({ pagado: sql<string>`coalesce(sum(${pagosProveedor.valor}),0)`, ret: sql<string>`coalesce(sum(${pagosProveedor.retencionTotal}),0)` })
    .from(pagosProveedor).innerJoin(cuentasPorPagar, eq(pagosProveedor.cuentaPorPagarId, cuentasPorPagar.id)).where(condC);

  const detV = await db.select({ numero: facturas.numero, fecha: facturas.fecha, cliente: terceros.razonSocial, total: facturas.total })
    .from(facturas).innerJoin(terceros, eq(facturas.clienteId, terceros.id)).where(condV).orderBy(desc(facturas.fecha));

  const ventasFE = Number(v?.total ?? 0); const comprasFE = Number(c?.pagado ?? 0); const ret = Number(c?.ret ?? 0);
  return {
    kpis: [
      { label: "Ventas F.E.", valor: ventasFE, formato: "money" },
      { label: "# Facturas F.E.", valor: Number(v?.n ?? 0), formato: "num" },
      { label: "Compras F.E. pagadas", valor: comprasFE, formato: "money" },
      { label: "Retenciones", valor: ret, formato: "money" },
    ],
    series: {
      ventasDia: ventasDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      ventasVsCompras: [{ x: "Ventas F.E.", etiqueta: "Ventas F.E.", y: ventasFE }, { x: "Compras F.E.", etiqueta: "Compras F.E.", y: comprasFE }],
    },
    detalle: {
      columnas: [{ header: "Factura", tipo: "texto" }, { header: "Fecha", tipo: "fecha" }, { header: "Cliente", tipo: "texto" }, { header: "Total", tipo: "money", total: true }],
      filas: detV.map((r) => [r.numero, r.fecha, r.cliente, Number(r.total)]),
    },
  };
}
