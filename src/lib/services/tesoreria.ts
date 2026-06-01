import "server-only";
import { and, eq, asc, sql } from "drizzle-orm";
import { hoyColombia } from "@/lib/fecha";
import { db } from "@/lib/db";
import { cuentasPropias, movimientosTesoreria } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { saldoCorrido } from "@/lib/domain/tesoreria";
import type { CuentaPropiaInput } from "@/lib/validation/cuenta-propia";
import type { MovimientoManualInput } from "@/lib/validation/movimiento-tesoreria";
import type { Contexto } from "./bodegas";

export type CuentaPropia = typeof cuentasPropias.$inferSelect;
export type MovimientoTesoreria = typeof movimientosTesoreria.$inferSelect;

/** Lista cuentas propias con su saldo actual derivado del libro. */
export async function listarCuentasPropias(empresaId: number) {
  const cuentas = await db
    .select()
    .from(cuentasPropias)
    .where(eq(cuentasPropias.empresaId, empresaId))
    .orderBy(cuentasPropias.nombre);

  const sumas = await db
    .select({
      cuentaId: movimientosTesoreria.cuentaPropiaId,
      entradas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo} = 'entrada' then ${movimientosTesoreria.valor} else 0 end), 0)`,
      salidas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo} = 'salida' then ${movimientosTesoreria.valor} else 0 end), 0)`,
    })
    .from(movimientosTesoreria)
    .where(eq(movimientosTesoreria.empresaId, empresaId))
    .groupBy(movimientosTesoreria.cuentaPropiaId);
  const porCuenta = new Map(sumas.map((s) => [s.cuentaId, Number(s.entradas) - Number(s.salidas)]));

  // El saldo inicial ya está materializado como movimiento, así que el saldo
  // es solo la suma del libro; saldoInicial de la fila es informativo.
  return cuentas.map((c) => ({ ...c, saldo: porCuenta.get(c.id) ?? 0 }));
}

export async function obtenerCuentaPropia(empresaId: number, id: number): Promise<CuentaPropia | null> {
  const [c] = await db
    .select()
    .from(cuentasPropias)
    .where(and(eq(cuentasPropias.empresaId, empresaId), eq(cuentasPropias.id, id)))
    .limit(1);
  return c ?? null;
}

/** Movimientos de una cuenta con saldo corrido (más antiguos primero). */
export async function extractoCuenta(empresaId: number, cuentaId: number) {
  const movs = await db
    .select()
    .from(movimientosTesoreria)
    .where(and(eq(movimientosTesoreria.empresaId, empresaId), eq(movimientosTesoreria.cuentaPropiaId, cuentaId)))
    .orderBy(asc(movimientosTesoreria.fecha), asc(movimientosTesoreria.id));
  const conValor = movs.map((m) => ({ ...m, tipo: m.tipo, valor: Number(m.valor) }));
  // El saldo inicial es el primer movimiento, así que arrancamos el corrido en 0.
  return saldoCorrido(0, conValor);
}

export async function crearCuentaPropia(data: CuentaPropiaInput, ctx: Contexto): Promise<void> {
  await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(cuentasPropias)
      .values({
        empresaId: ctx.empresaId,
        nombre: data.nombre,
        tipo: data.tipo,
        banco: data.banco || null,
        numeroCuenta: data.numeroCuenta || null,
        titularNit: data.titularNit || null,
        titularNombre: data.titularNombre || null,
        saldoInicial: String(data.saldoInicial),
        activa: data.activa,
      })
      .returning();

    if (data.saldoInicial !== 0) {
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: c.id,
        fecha: hoyColombia(),
        tipo: data.saldoInicial >= 0 ? "entrada" : "salida",
        origen: "saldo_inicial",
        valor: String(Math.abs(data.saldoInicial)),
        descripcion: "Saldo inicial",
        usuarioId: ctx.usuarioId,
      });
    }

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx33", modelId: c.id, accion: "CREAR", registroNuevo: c, ipOrigen: ctx.ip },
      tx,
    );
  });
}

export async function actualizarCuentaPropia(id: number, data: CuentaPropiaInput, ctx: Contexto): Promise<void> {
  const anterior = await obtenerCuentaPropia(ctx.empresaId, id);
  if (!anterior) throw new Error("Cuenta no encontrada.");
  // No se reescribe el saldo inicial materializado: solo datos descriptivos.
  const [c] = await db
    .update(cuentasPropias)
    .set({
      nombre: data.nombre,
      tipo: data.tipo,
      banco: data.banco || null,
      numeroCuenta: data.numeroCuenta || null,
      titularNit: data.titularNit || null,
      titularNombre: data.titularNombre || null,
      activa: data.activa,
      updatedAt: new Date(),
    })
    .where(and(eq(cuentasPropias.empresaId, ctx.empresaId), eq(cuentasPropias.id, id)))
    .returning();
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx33", modelId: id, accion: "ACTUALIZAR", registroAnterior: anterior, registroNuevo: c, ipOrigen: ctx.ip });
}

const TIPO_POR_ORIGEN: Record<string, "entrada" | "salida"> = {
  consignacion: "entrada",
  comision: "salida",
  retiro: "salida",
};

/** Registra un movimiento manual. Traslado = salida en origen + entrada en contracuenta. */
export async function registrarMovimientoManual(data: MovimientoManualInput, ctx: Contexto): Promise<void> {
  await db.transaction(async (tx) => {
    if (data.origen === "traslado") {
      await tx.insert(movimientosTesoreria).values([
        { empresaId: ctx.empresaId, cuentaPropiaId: data.cuentaPropiaId, fecha: data.fecha, tipo: "salida", origen: "traslado", valor: String(data.valor), descripcion: data.descripcion || "Traslado", contraCuentaId: data.contraCuentaId, usuarioId: ctx.usuarioId },
        { empresaId: ctx.empresaId, cuentaPropiaId: data.contraCuentaId!, fecha: data.fecha, tipo: "entrada", origen: "traslado", valor: String(data.valor), descripcion: data.descripcion || "Traslado", contraCuentaId: data.cuentaPropiaId, usuarioId: ctx.usuarioId },
      ]);
    } else {
      const tipo = data.origen === "ajuste" ? "entrada" : TIPO_POR_ORIGEN[data.origen];
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: data.cuentaPropiaId,
        fecha: data.fecha,
        tipo,
        origen: data.origen,
        valor: String(data.valor),
        descripcion: data.descripcion || null,
        usuarioId: ctx.usuarioId,
      });
    }
    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx35", modelId: data.cuentaPropiaId, accion: "CREAR", registroNuevo: data, ipOrigen: ctx.ip },
      tx,
    );
  });
}

/** Opciones para selects (solo activas). */
export async function cuentasPropiasActivas(empresaId: number) {
  return db
    .select({ id: cuentasPropias.id, nombre: cuentasPropias.nombre, tipo: cuentasPropias.tipo, banco: cuentasPropias.banco })
    .from(cuentasPropias)
    .where(and(eq(cuentasPropias.empresaId, empresaId), eq(cuentasPropias.activa, true)))
    .orderBy(cuentasPropias.nombre);
}
