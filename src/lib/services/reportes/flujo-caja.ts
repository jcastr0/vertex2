// src/lib/services/reportes/flujo-caja.ts
import "server-only";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { movimientosTesoreria, cuentasPropias } from "@/lib/db/schema";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarFlujoCaja(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(eq(movimientosTesoreria.empresaId, empresaId), gte(movimientosTesoreria.fecha, f.desde!), lte(movimientosTesoreria.fecha, f.hasta!),
    f.cuenta ? eq(movimientosTesoreria.cuentaPropiaId, Number(f.cuenta)) : undefined);
  const [tot] = await db.select({
    entradas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo}='entrada' then ${movimientosTesoreria.valor} else 0 end),0)`,
    salidas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo}='salida' then ${movimientosTesoreria.valor} else 0 end),0)`,
  }).from(movimientosTesoreria).where(cond);
  const entradas = Number(tot?.entradas ?? 0); const salidas = Number(tot?.salidas ?? 0);
  const porDia = await db.select({ x: movimientosTesoreria.fecha,
    y: sql<string>`sum(case when ${movimientosTesoreria.tipo}='entrada' then ${movimientosTesoreria.valor} else -${movimientosTesoreria.valor} end)` })
    .from(movimientosTesoreria).where(cond).groupBy(movimientosTesoreria.fecha).orderBy(movimientosTesoreria.fecha);
  const porCuenta = await db.select({ etiqueta: cuentasPropias.nombre,
    y: sql<string>`sum(case when ${movimientosTesoreria.tipo}='entrada' then ${movimientosTesoreria.valor} else -${movimientosTesoreria.valor} end)` })
    .from(movimientosTesoreria).innerJoin(cuentasPropias, eq(movimientosTesoreria.cuentaPropiaId, cuentasPropias.id)).where(cond).groupBy(cuentasPropias.nombre);
  const det = await db.select({ fecha: movimientosTesoreria.fecha, cuenta: cuentasPropias.nombre, tipo: movimientosTesoreria.tipo, origen: movimientosTesoreria.origen, valor: movimientosTesoreria.valor, descripcion: movimientosTesoreria.descripcion })
    .from(movimientosTesoreria).innerJoin(cuentasPropias, eq(movimientosTesoreria.cuentaPropiaId, cuentasPropias.id)).where(cond).orderBy(desc(movimientosTesoreria.fecha));
  return {
    kpis: [
      { label: "Entradas", valor: entradas, formato: "money" },
      { label: "Salidas", valor: salidas, formato: "money" },
      { label: "Neto", valor: entradas - salidas, formato: "money" },
      { label: "# Movimientos", valor: det.length, formato: "num" },
    ],
    series: {
      flujoDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      netoPorCuenta: porCuenta.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
      entradasVsSalidas: [{ x: "Entradas", etiqueta: "Entradas", y: entradas }, { x: "Salidas", etiqueta: "Salidas", y: salidas }],
    },
    detalle: {
      columnas: [{ header: "Fecha", tipo: "fecha" }, { header: "Cuenta", tipo: "texto" }, { header: "Tipo", tipo: "texto" }, { header: "Origen", tipo: "texto" }, { header: "Descripción", tipo: "texto" }, { header: "Valor", tipo: "money", total: true }],
      filas: det.map((r) => [r.fecha, r.cuenta, r.tipo, r.origen, r.descripcion ?? "", Number(r.valor)]),
    },
  };
}
export async function filtrosFlujoCaja(empresaId: number) {
  const cuentas = await db.select({ value: cuentasPropias.id, label: cuentasPropias.nombre }).from(cuentasPropias).where(eq(cuentasPropias.empresaId, empresaId)).orderBy(cuentasPropias.nombre);
  return cuentas.map((c) => ({ value: String(c.value), label: c.label }));
}
