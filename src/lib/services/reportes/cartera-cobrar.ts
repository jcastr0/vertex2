// src/lib/services/reportes/cartera-cobrar.ts
import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasPorCobrar, facturas, terceros } from "@/lib/db/schema";
import { tramoAging } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const dias = (venc: string, corte: string) => Math.floor((Date.parse(corte) - Date.parse(venc)) / 86400000);

export async function cargarCarteraCobrar(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const corte = f.hasta!;
  const cond = and(
    eq(cuentasPorCobrar.empresaId, empresaId),
    gt(cuentasPorCobrar.saldoPendiente, "0"),
    f.cliente ? eq(cuentasPorCobrar.clienteId, Number(f.cliente)) : undefined,
  );
  const rows = await db
    .select({
      id: cuentasPorCobrar.id, cliente: terceros.razonSocial, numero: facturas.numero,
      fecha: cuentasPorCobrar.fechaFactura, vence: cuentasPorCobrar.fechaVencimiento,
      saldo: cuentasPorCobrar.saldoPendiente,
    })
    .from(cuentasPorCobrar)
    .innerJoin(facturas, eq(cuentasPorCobrar.facturaId, facturas.id))
    .innerJoin(terceros, eq(cuentasPorCobrar.clienteId, terceros.id))
    .where(cond).orderBy(cuentasPorCobrar.fechaVencimiento);

  const enriq = rows.map((r) => { const dv = dias(r.vence, corte); return { ...r, saldo: Number(r.saldo), dv, tramo: tramoAging(dv) }; });
  const total = enriq.reduce((a, r) => a + r.saldo, 0);
  const vencido = enriq.filter((r) => r.dv > 0).reduce((a, r) => a + r.saldo, 0);
  const clientesUnicos = new Set(enriq.map((r) => r.cliente)).size;

  const tramos = ["Corriente", "1-30", "31-60", "61-90", "+90"];
  const porTramo = tramos.map((t) => ({ x: t, etiqueta: t, y: enriq.filter((r) => r.tramo === t).reduce((a, r) => a + r.saldo, 0) }));

  const porDeudor = Object.values(enriq.reduce<Record<string, { etiqueta: string; x: string; y: number }>>((acc, r) => {
    (acc[r.cliente] ??= { etiqueta: r.cliente, x: r.cliente, y: 0 }).y += r.saldo; return acc;
  }, {})).sort((a, b) => b.y - a.y).slice(0, 10);

  return {
    kpis: [
      { label: "Por cobrar total", valor: total, formato: "money" },
      { label: "Vencido", valor: vencido, formato: "money" },
      { label: "Por vencer", valor: total - vencido, formato: "money" },
      { label: "# Clientes", valor: clientesUnicos, formato: "num" },
    ],
    series: {
      porTramo,
      topDeudores: porDeudor,
      vencidoVsPorVencer: [
        { x: "Vencido", etiqueta: "Vencido", y: vencido },
        { x: "Por vencer", etiqueta: "Por vencer", y: total - vencido },
      ],
    },
    detalle: {
      columnas: [
        { header: "Cliente", tipo: "texto" }, { header: "Factura", tipo: "texto" },
        { header: "Fecha", tipo: "fecha" }, { header: "Vence", tipo: "fecha" },
        { header: "Días vencido", tipo: "num" }, { header: "Saldo", tipo: "money", total: true },
        { header: "Tramo", tipo: "texto" },
      ],
      filas: enriq.map((r) => [r.cliente, r.numero, r.fecha, r.vence, Math.max(0, r.dv), r.saldo, r.tramo]),
    },
  };
}

export async function filtrosCartera(empresaId: number) {
  const cli = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros)
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return cli.map((c) => ({ value: String(c.value), label: c.label }));
}
