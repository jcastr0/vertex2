// src/lib/services/reportes/recaudo.ts
import "server-only";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { recaudosClientes, visitasRecaudo, terceros, usuarios } from "@/lib/db/schema";
import { efectividadVisitas } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const RESULTADOS: Record<string, string> = { pago: "Pagó", abono: "Abonó", no_estaba: "No estaba", no_quiso: "No quiso" };

export async function cargarRecaudo(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(
    eq(recaudosClientes.empresaId, empresaId),
    eq(recaudosClientes.estado, "activo"),
    gte(recaudosClientes.fecha, f.desde!),
    lte(recaudosClientes.fecha, f.hasta!),
    f.recaudador ? eq(recaudosClientes.usuarioId, Number(f.recaudador)) : undefined,
  );
  const [tot] = await db.select({ recaudado: sql<string>`coalesce(sum(${recaudosClientes.valor}), 0)`, n: sql<number>`count(*)` }).from(recaudosClientes).where(cond);

  const porDia = await db.select({ x: recaudosClientes.fecha, y: sql<string>`sum(${recaudosClientes.valor})` })
    .from(recaudosClientes).where(cond).groupBy(recaudosClientes.fecha).orderBy(recaudosClientes.fecha);

  const porRec = await db.select({ etiqueta: usuarios.nombre, y: sql<string>`sum(${recaudosClientes.valor})` })
    .from(recaudosClientes).innerJoin(usuarios, eq(recaudosClientes.usuarioId, usuarios.id))
    .where(cond).groupBy(usuarios.nombre).orderBy(desc(sql`sum(${recaudosClientes.valor})`));

  // Visitas para efectividad y resultados
  const condV = and(eq(visitasRecaudo.empresaId, empresaId), gte(visitasRecaudo.fecha, f.desde!), lte(visitasRecaudo.fecha, f.hasta!),
    f.recaudador ? eq(visitasRecaudo.recaudadorId, Number(f.recaudador)) : undefined);
  const visitas = await db.select({ resultado: visitasRecaudo.resultado, n: sql<number>`count(*)` }).from(visitasRecaudo).where(condV).groupBy(visitasRecaudo.resultado);
  const totalVisitas = visitas.reduce((a, v) => a + Number(v.n), 0);
  const conPago = visitas.filter((v) => v.resultado === "pago" || v.resultado === "abono").reduce((a, v) => a + Number(v.n), 0);

  const det = await db.select({ fecha: recaudosClientes.fecha, numero: recaudosClientes.numero, cliente: terceros.razonSocial, recaudador: usuarios.nombre, valor: recaudosClientes.valor, metodo: recaudosClientes.metodoPago })
    .from(recaudosClientes)
    .innerJoin(terceros, eq(recaudosClientes.clienteId, terceros.id))
    .innerJoin(usuarios, eq(recaudosClientes.usuarioId, usuarios.id))
    .where(cond).orderBy(desc(recaudosClientes.fecha));

  return {
    kpis: [
      { label: "Recaudado", valor: Number(tot?.recaudado ?? 0), formato: "money" },
      { label: "# Recaudos", valor: Number(tot?.n ?? 0), formato: "num" },
      { label: "# Visitas", valor: totalVisitas, formato: "num" },
      { label: "Efectividad", valor: efectividadVisitas(conPago, totalVisitas), formato: "pct" },
    ],
    series: {
      porDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      porRecaudador: porRec.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
      resultados: visitas.map((v) => ({ x: RESULTADOS[v.resultado] ?? v.resultado, etiqueta: RESULTADOS[v.resultado] ?? v.resultado, y: Number(v.n) })),
    },
    detalle: {
      columnas: [
        { header: "Fecha", tipo: "fecha" }, { header: "Recibo", tipo: "texto" }, { header: "Cliente", tipo: "texto" },
        { header: "Recaudador", tipo: "texto" }, { header: "Método", tipo: "texto" }, { header: "Valor", tipo: "money", total: true },
      ],
      filas: det.map((r) => [r.fecha, r.numero, r.cliente, r.recaudador, r.metodo, Number(r.valor)]),
    },
  };
}

export async function filtrosRecaudo(empresaId: number) {
  const recs = await db.select({ value: usuarios.id, label: usuarios.nombre }).from(usuarios)
    .where(and(eq(usuarios.empresaId, empresaId), eq(usuarios.esRecaudador, true))).orderBy(usuarios.nombre);
  return recs.map((r) => ({ value: String(r.value), label: r.label }));
}
