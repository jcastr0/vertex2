import "server-only";
import { and, eq, sql, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { terceros, cuentasPorCobrar, visitasRecaudo, recaudosClientes, usuarios } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { ordenarRuta, type ParadaRuta } from "@/lib/domain/ruta-recaudo";
import { registrarRecaudo, type DatosAbono } from "./cartera";
import type { Contexto } from "./bodegas";

export class RutaError extends Error {}

export interface ParadaCliente extends ParadaRuta {
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  celular: string | null;
  resultadoHoy: string | null;
}

function diasEntre(desdeISO: string, hastaISO: string): number {
  const ms = new Date(hastaISO).getTime() - new Date(desdeISO).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Construye la ruta del recaudador: clientes asignados con saldo > 0, ordenados. */
export async function rutaDelRecaudador(
  empresaId: number,
  recaudadorId: number,
  hoyDia: number,
  hoyISO: string,
): Promise<{ paradas: ParadaCliente[]; recaudadoHoy: number }> {
  const filas = await db
    .select({
      clienteId: terceros.id,
      nombre: terceros.razonSocial,
      direccion: terceros.direccion,
      ciudad: terceros.ciudad,
      telefono: terceros.telefono,
      celular: terceros.celular,
      diaCobro: terceros.diaCobro,
      saldo: sql<string>`coalesce(sum(${cuentasPorCobrar.saldoPendiente}), 0)`,
      venc: sql<string | null>`min(${cuentasPorCobrar.fechaVencimiento})`,
    })
    .from(terceros)
    .leftJoin(
      cuentasPorCobrar,
      and(
        eq(cuentasPorCobrar.clienteId, terceros.id),
        sql`${cuentasPorCobrar.saldoPendiente} > 0`,
      ),
    )
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.recaudadorId, recaudadorId), eq(terceros.activo, true)))
    .groupBy(terceros.id);

  // Visitas de hoy (para marcar el estado).
  const visitasHoy = await db
    .select({ clienteId: visitasRecaudo.clienteId, resultado: visitasRecaudo.resultado })
    .from(visitasRecaudo)
    .where(
      and(
        eq(visitasRecaudo.empresaId, empresaId),
        eq(visitasRecaudo.recaudadorId, recaudadorId),
        eq(visitasRecaudo.fecha, hoyISO),
      ),
    );
  const visitaPorCliente = new Map(visitasHoy.map((v) => [v.clienteId, v.resultado]));

  const paradas: ParadaCliente[] = filas
    .map((f) => ({
      clienteId: f.clienteId,
      nombre: f.nombre,
      direccion: f.direccion,
      ciudad: f.ciudad,
      telefono: f.telefono,
      celular: f.celular,
      diaCobro: f.diaCobro,
      saldo: Number(f.saldo),
      diasVencido: f.venc ? diasEntre(f.venc, hoyISO) : 0,
      resultadoHoy: visitaPorCliente.get(f.clienteId) ?? null,
    }))
    .filter((p) => p.saldo > 0);

  // Recaudado hoy del recaudador: se atribuye vía la visita (un admin puede
  // registrar el recaudo a nombre del recaudador).
  const recaudadoHoy = Number(
    (
      await db
        .select({ v: sql<string>`coalesce(sum(${recaudosClientes.valor}), 0)` })
        .from(visitasRecaudo)
        .innerJoin(recaudosClientes, eq(visitasRecaudo.recaudoId, recaudosClientes.id))
        .where(
          and(
            eq(visitasRecaudo.empresaId, empresaId),
            eq(visitasRecaudo.recaudadorId, recaudadorId),
            eq(visitasRecaudo.fecha, hoyISO),
          ),
        )
    )[0]?.v ?? 0,
  );

  return { paradas: ordenarRuta(paradas, hoyDia), recaudadoHoy };
}

/** Recauda desde la ruta: aplica al CxC más antiguo del cliente y registra la visita. */
export async function recaudarEnRuta(
  clienteId: number,
  recaudadorId: number,
  datos: DatosAbono,
  ctx: Contexto,
): Promise<void> {
  const [cxc] = await db
    .select()
    .from(cuentasPorCobrar)
    .where(
      and(
        eq(cuentasPorCobrar.empresaId, ctx.empresaId),
        eq(cuentasPorCobrar.clienteId, clienteId),
        sql`${cuentasPorCobrar.saldoPendiente} > 0`,
      ),
    )
    .orderBy(asc(cuentasPorCobrar.fechaVencimiento))
    .limit(1);
  if (!cxc) throw new RutaError("El cliente no tiene saldo pendiente.");

  const recaudoId = await registrarRecaudo(cxc.id, datos, ctx);
  await db.insert(visitasRecaudo).values({
    empresaId: ctx.empresaId,
    recaudadorId,
    clienteId,
    fecha: datos.fecha,
    resultado: "abono",
    recaudoId,
    usuarioId: ctx.usuarioId,
  });
}

/** Registra una visita sin pago (no estaba / no quiso), con foto opcional. */
export interface ClienteProgramacion {
  id: number;
  nombre: string;
  recaudadorId: number | null;
  recaudador: string | null;
  diaCobro: number | null;
  saldo: number;
}

/** Clientes con su programación de recaudo (recaudador + día) y su saldo. */
export async function clientesParaRuta(empresaId: number): Promise<ClienteProgramacion[]> {
  const rec = usuarios; // alias legible
  const rows = await db
    .select({
      id: terceros.id,
      nombre: terceros.razonSocial,
      recaudadorId: terceros.recaudadorId,
      recaudador: rec.nombre,
      diaCobro: terceros.diaCobro,
      saldo: sql<string>`coalesce(sum(${cuentasPorCobrar.saldoPendiente}), 0)`,
    })
    .from(terceros)
    .leftJoin(cuentasPorCobrar, eq(cuentasPorCobrar.clienteId, terceros.id))
    .leftJoin(rec, eq(terceros.recaudadorId, rec.id))
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true), inArray(terceros.tipo, ["cliente", "ambos"])))
    .groupBy(terceros.id, terceros.razonSocial, terceros.recaudadorId, rec.nombre, terceros.diaCobro)
    .orderBy(asc(terceros.razonSocial));
  return rows.map((r) => ({ ...r, saldo: Number(r.saldo) }));
}

/**
 * Programa (o reprograma) el recaudo de varios clientes a la vez: les fija el
 * recaudador y el día de cobro. `recaudadorId`/`diaCobro` en null = sin asignar.
 */
export async function asignarRecaudo(
  empresaId: number,
  clienteIds: number[],
  recaudadorId: number | null,
  diaCobro: number | null,
  ctx: Contexto,
): Promise<number> {
  if (clienteIds.length === 0) return 0;
  await db
    .update(terceros)
    .set({ recaudadorId, diaCobro, updatedAt: new Date() })
    .where(and(eq(terceros.empresaId, empresaId), inArray(terceros.id, clienteIds)));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx07",
    modelId: clienteIds[0],
    accion: "ACTUALIZAR",
    registroNuevo: { ruta: { clienteIds, recaudadorId, diaCobro } },
    ipOrigen: ctx.ip,
  });
  return clienteIds.length;
}

export async function registrarVisita(
  clienteId: number,
  recaudadorId: number,
  resultado: string,
  fecha: string,
  fotoUrl: string | null,
  observaciones: string | null,
  ctx: Contexto,
): Promise<void> {
  const [v] = await db
    .insert(visitasRecaudo)
    .values({
      empresaId: ctx.empresaId,
      recaudadorId,
      clienteId,
      fecha,
      resultado,
      fotoUrl,
      observaciones,
      usuarioId: ctx.usuarioId,
    })
    .returning();
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx30",
    modelId: v.id,
    accion: "CREAR",
    registroNuevo: { clienteId, resultado },
    ipOrigen: ctx.ip,
  });
}
