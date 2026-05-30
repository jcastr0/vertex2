import "server-only";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notasInventario,
  inventario,
  movimientosInventario,
  productos,
  bodegas,
} from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { signoNota } from "@/lib/domain/nota-inventario";
import type { NotaInventarioInput } from "@/lib/validation/nota-inventario";
import type { Contexto } from "./bodegas";

export class NotaInvalida extends Error {}

export async function listarNotasInventario(empresaId: number) {
  return db
    .select({
      nota: notasInventario,
      producto: productos.nombre,
      bodega: bodegas.nombre,
    })
    .from(notasInventario)
    .innerJoin(productos, eq(notasInventario.productoId, productos.id))
    .innerJoin(bodegas, eq(notasInventario.bodegaId, bodegas.id))
    .where(eq(notasInventario.empresaId, empresaId))
    .orderBy(desc(notasInventario.createdAt));
}

async function siguienteNumero(empresaId: number): Promise<string> {
  const [{ c }] = await db
    .select({ c: count() })
    .from(notasInventario)
    .where(eq(notasInventario.empresaId, empresaId));
  return formatearNumero("NI", Number(c) + 1);
}

/** Crea una nota de inventario y ajusta existencias (transaccional). */
export async function crearNotaInventario(
  data: NotaInventarioInput,
  ctx: Contexto,
): Promise<void> {
  const signo = signoNota(data.tipo);
  const numero = await siguienteNumero(ctx.empresaId);

  await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(inventario)
      .where(
        and(
          eq(inventario.empresaId, ctx.empresaId),
          eq(inventario.bodegaId, data.bodegaId),
          eq(inventario.productoId, data.productoId),
        ),
      )
      .limit(1);

    const actual = inv ? Number(inv.cantidadActual) : 0;
    const costo = inv ? Number(inv.costoPromedio) : 0;
    const nueva = actual + signo * data.cantidad;
    if (nueva < 0) {
      throw new NotaInvalida(
        `No hay existencias suficientes: disponible ${actual}, ajuste ${signo * data.cantidad}.`,
      );
    }

    if (inv) {
      await tx
        .update(inventario)
        .set({
          cantidadActual: String(nueva),
          valorTotal: String(nueva * costo),
          ultimaActualizacion: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventario.id, inv.id));
    } else {
      await tx.insert(inventario).values({
        empresaId: ctx.empresaId,
        bodegaId: data.bodegaId,
        productoId: data.productoId,
        cantidadActual: String(nueva),
        costoPromedio: "0",
        valorTotal: "0",
        ultimaActualizacion: new Date(),
      });
    }

    await tx.insert(movimientosInventario).values({
      empresaId: ctx.empresaId,
      bodegaId: data.bodegaId,
      productoId: data.productoId,
      tipo: "ajuste",
      cantidad: String(signo * data.cantidad),
      costoUnitario: String(costo),
      referencia: numero,
      observaciones: `${data.tipo}: ${data.motivo}`,
      usuarioId: ctx.usuarioId,
    });

    const [nota] = await tx
      .insert(notasInventario)
      .values({
        empresaId: ctx.empresaId,
        bodegaId: data.bodegaId,
        productoId: data.productoId,
        numero,
        tipo: data.tipo,
        cantidad: String(data.cantidad),
        motivo: data.motivo,
        proveedorId: data.proveedorId ?? null,
        usuarioId: ctx.usuarioId,
      })
      .returning();

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx18",
        modelId: nota.id,
        accion: "CREAR",
        registroNuevo: nota,
        ipOrigen: ctx.ip,
      },
      tx,
    );
  });
}
