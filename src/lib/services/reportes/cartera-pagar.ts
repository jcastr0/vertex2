// src/lib/services/reportes/cartera-pagar.ts
import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasPorPagar, terceros } from "@/lib/db/schema";
import { tramoAging } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const dias = (venc: string, corte: string) => Math.floor((Date.parse(corte) - Date.parse(venc)) / 86400000);

export async function cargarCarteraPagar(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const corte = f.hasta!;
  const cond = and(eq(cuentasPorPagar.empresaId, empresaId), gt(cuentasPorPagar.saldoPendiente, "0"),
    f.proveedor ? eq(cuentasPorPagar.proveedorId, Number(f.proveedor)) : undefined);
  const rows = await db.select({ proveedorId: cuentasPorPagar.proveedorId, proveedor: terceros.razonSocial, numero: cuentasPorPagar.numeroFactura, fecha: cuentasPorPagar.fechaFactura, vence: cuentasPorPagar.fechaVencimiento, saldo: cuentasPorPagar.saldoPendiente })
    .from(cuentasPorPagar).innerJoin(terceros, eq(cuentasPorPagar.proveedorId, terceros.id)).where(cond).orderBy(cuentasPorPagar.fechaVencimiento);
  const enriq = rows.map((r) => { const dv = dias(r.vence, corte); return { ...r, saldo: Number(r.saldo), dv, tramo: tramoAging(dv) }; });
  const total = enriq.reduce((a, r) => a + r.saldo, 0);
  const vencido = enriq.filter((r) => r.dv > 0).reduce((a, r) => a + r.saldo, 0);
  const tramos = ["Corriente", "1-30", "31-60", "61-90", "+90"];
  const porTramo = tramos.map((t) => ({ x: t, etiqueta: t, y: enriq.filter((r) => r.tramo === t).reduce((a, r) => a + r.saldo, 0) }));
  const porProv = Object.values(enriq.reduce<Record<number, { etiqueta: string; x: string; y: number }>>((acc, r) => { (acc[r.proveedorId] ??= { etiqueta: r.proveedor, x: r.proveedor, y: 0 }).y += r.saldo; return acc; }, {})).sort((a, b) => b.y - a.y).slice(0, 10);
  return {
    kpis: [
      { label: "Por pagar total", valor: total, formato: "money" },
      { label: "Vencido", valor: vencido, formato: "money" },
      { label: "Por vencer", valor: total - vencido, formato: "money" },
      { label: "# Proveedores", valor: new Set(enriq.map((r) => r.proveedorId)).size, formato: "num" },
    ],
    series: {
      porTramo, topProveedores: porProv,
      vencidoVsPorVencer: [{ x: "Vencido", etiqueta: "Vencido", y: vencido }, { x: "Por vencer", etiqueta: "Por vencer", y: total - vencido }],
    },
    detalle: {
      columnas: [{ header: "Proveedor", tipo: "texto" }, { header: "Factura", tipo: "texto" }, { header: "Fecha", tipo: "fecha" }, { header: "Vence", tipo: "fecha" }, { header: "Días vencido", tipo: "num" }, { header: "Saldo", tipo: "money", total: true }, { header: "Tramo", tipo: "texto" }],
      filas: enriq.map((r) => [r.proveedor, r.numero, r.fecha, r.vence, Math.max(0, r.dv), r.saldo, r.tramo]),
    },
  };
}
export async function filtrosCarteraPagar(empresaId: number) {
  const provs = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros).where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return provs.map((p) => ({ value: String(p.value), label: p.label }));
}
