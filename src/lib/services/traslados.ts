import "server-only";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  trasladosBodega,
  trasladoDetalles,
  inventario,
  movimientosInventario,
  bodegas,
} from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { costoPromedioPonderado } from "@/lib/domain/costeo";
import type { TrasladoInput } from "@/lib/validation/traslado";
import type { Contexto } from "./bodegas";

export class TrasladoInvalido extends Error {}

export async function listarTraslados(empresaId: number) {
  const o = bodegas;
  const rows = await db
    .select({
      traslado: trasladosBodega,
      origen: o.nombre,
    })
    .from(trasladosBodega)
    .innerJoin(o, eq(trasladosBodega.bodegaOrigenId, o.id))
    .where(eq(trasladosBodega.empresaId, empresaId))
    .orderBy(desc(trasladosBodega.createdAt));
  return rows;
}

export async function obtenerTraslado(empresaId: number, id: number) {
  const [t] = await db
    .select()
    .from(trasladosBodega)
    .where(and(eq(trasladosBodega.empresaId, empresaId), eq(trasladosBodega.id, id)))
    .limit(1);
  if (!t) return null;
  const detalles = await db
    .select()
    .from(trasladoDetalles)
    .where(eq(trasladoDetalles.trasladoId, id));
  return { ...t, detalles };
}

async function siguienteNumero(empresaId: number): Promise<string> {
  const [{ c }] = await db
    .select({ c: count() })
    .from(trasladosBodega)
    .where(eq(trasladosBodega.empresaId, empresaId));
  return formatearNumero("TR", Number(c) + 1);
}

export async function crearTraslado(data: TrasladoInput, ctx: Contexto): Promise<number> {
  const numero = await siguienteNumero(ctx.empresaId);
  return db.transaction(async (tx) => {
    const [traslado] = await tx
      .insert(trasladosBodega)
      .values({
        empresaId: ctx.empresaId,
        numero,
        bodegaOrigenId: data.bodegaOrigenId,
        bodegaDestinoId: data.bodegaDestinoId,
        estado: "pendiente",
        observaciones: data.observaciones || null,
        usuarioCreaId: ctx.usuarioId,
      })
      .returning();

    await tx.insert(trasladoDetalles).values(
      data.lineas.map((l) => ({
        trasladoId: traslado.id,
        productoId: l.productoId,
        cantidad: String(l.cantidad),
        costoUnitario: "0",
      })),
    );

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx19",
        modelId: traslado.id,
        accion: "CREAR",
        registroNuevo: traslado,
        ipOrigen: ctx.ip,
      },
      tx,
    );
    return traslado.id;
  });
}

/** Envía el traslado: descuenta de la bodega origen al costo promedio actual. */
export async function enviarTraslado(id: number, ctx: Contexto): Promise<void> {
  const t = await obtenerTraslado(ctx.empresaId, id);
  if (!t) throw new TrasladoInvalido("Traslado no encontrado.");
  if (t.estado !== "pendiente") throw new TrasladoInvalido("El traslado ya fue enviado o cancelado.");

  await db.transaction(async (tx) => {
    for (const d of t.detalles) {
      const cant = Number(d.cantidad);
      const [inv] = await tx
        .select()
        .from(inventario)
        .where(
          and(
            eq(inventario.empresaId, ctx.empresaId),
            eq(inventario.bodegaId, t.bodegaOrigenId),
            eq(inventario.productoId, d.productoId),
          ),
        )
        .limit(1);
      const disp = inv ? Number(inv.cantidadActual) : 0;
      if (cant > disp) {
        throw new TrasladoInvalido(
          `Stock insuficiente en origen para el producto #${d.productoId}: disponible ${disp}.`,
        );
      }
      const costo = inv ? Number(inv.costoPromedio) : 0;
      const nueva = disp - cant;
      await tx
        .update(inventario)
        .set({
          cantidadActual: String(nueva),
          valorTotal: String(nueva * costo),
          ultimaActualizacion: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventario.id, inv!.id));

      await tx
        .update(trasladoDetalles)
        .set({ costoUnitario: String(costo) })
        .where(eq(trasladoDetalles.id, d.id));

      await tx.insert(movimientosInventario).values({
        empresaId: ctx.empresaId,
        bodegaId: t.bodegaOrigenId,
        productoId: d.productoId,
        trasladoId: t.id,
        tipo: "traslado_salida",
        cantidad: String(cant),
        costoUnitario: String(costo),
        referencia: t.numero,
        usuarioId: ctx.usuarioId,
      });
    }

    await tx
      .update(trasladosBodega)
      .set({ estado: "enviado", fechaEnvio: new Date(), usuarioEnviaId: ctx.usuarioId, updatedAt: new Date() })
      .where(eq(trasladosBodega.id, t.id));

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx19",
        modelId: t.id,
        accion: "ACTUALIZAR",
        registroNuevo: { estado: "enviado" },
        ipOrigen: ctx.ip,
      },
      tx,
    );
  });
}

/** Recibe el traslado: ingresa a la bodega destino con costo promedio ponderado. */
export async function recibirTraslado(id: number, ctx: Contexto): Promise<void> {
  const t = await obtenerTraslado(ctx.empresaId, id);
  if (!t) throw new TrasladoInvalido("Traslado no encontrado.");
  if (t.estado !== "enviado") throw new TrasladoInvalido("El traslado no está en tránsito.");

  await db.transaction(async (tx) => {
    for (const d of t.detalles) {
      const cant = Number(d.cantidad);
      const costo = Number(d.costoUnitario);
      const [inv] = await tx
        .select()
        .from(inventario)
        .where(
          and(
            eq(inventario.empresaId, ctx.empresaId),
            eq(inventario.bodegaId, t.bodegaDestinoId),
            eq(inventario.productoId, d.productoId),
          ),
        )
        .limit(1);
      const actCant = inv ? Number(inv.cantidadActual) : 0;
      const actCosto = inv ? Number(inv.costoPromedio) : 0;
      const r = costoPromedioPonderado(actCant, actCosto, cant, costo);

      if (inv) {
        await tx
          .update(inventario)
          .set({
            cantidadActual: String(r.cantidad),
            costoPromedio: String(r.costoPromedio),
            valorTotal: String(r.cantidad * r.costoPromedio),
            ultimaActualizacion: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(inventario.id, inv.id));
      } else {
        await tx.insert(inventario).values({
          empresaId: ctx.empresaId,
          bodegaId: t.bodegaDestinoId,
          productoId: d.productoId,
          cantidadActual: String(r.cantidad),
          costoPromedio: String(r.costoPromedio),
          valorTotal: String(r.cantidad * r.costoPromedio),
          ultimaActualizacion: new Date(),
        });
      }

      await tx.insert(movimientosInventario).values({
        empresaId: ctx.empresaId,
        bodegaId: t.bodegaDestinoId,
        productoId: d.productoId,
        trasladoId: t.id,
        tipo: "traslado_entrada",
        cantidad: String(cant),
        costoUnitario: String(costo),
        referencia: t.numero,
        usuarioId: ctx.usuarioId,
      });

      await tx
        .update(trasladoDetalles)
        .set({ cantidadRecibida: String(cant) })
        .where(eq(trasladoDetalles.id, d.id));
    }

    await tx
      .update(trasladosBodega)
      .set({ estado: "recibido", fechaRecepcion: new Date(), usuarioRecibeId: ctx.usuarioId, updatedAt: new Date() })
      .where(eq(trasladosBodega.id, t.id));

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx19",
        modelId: t.id,
        accion: "ACTUALIZAR",
        registroNuevo: { estado: "recibido" },
        ipOrigen: ctx.ip,
      },
      tx,
    );
  });
}
