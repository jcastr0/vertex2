import "server-only";
import { and, eq, desc, count, inArray } from "drizzle-orm";
import { sumarDias } from "@/lib/fecha";
import { db } from "@/lib/db";
import {
  pedidos,
  pedidoDetalles,
  pedidoCostos,
  productos,
  productoUnidades,
  inventario,
  movimientosInventario,
  cuentasPorPagar,
  terceros,
} from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { cantidadEnBase } from "@/lib/domain/conversion";
import { prorratearCostos, costoPromedioPonderado, costoUnitarioBase } from "@/lib/domain/costeo";
import type { Contexto } from "./bodegas";

export type Pedido = typeof pedidos.$inferSelect;
export type PedidoDetalle = typeof pedidoDetalles.$inferSelect;

export interface LineaPedido {
  productoId: number;
  unidadId: number;
  cantidad: number;
  precioUnitario: number;
}
export interface CostoPedido {
  /** Nombre de la categoría de gasto (etiqueta denormalizada: "Flete", "Gasolina"…). */
  tipo: string;
  /** Categoría de gasto (vx08, tipo='gasto'). Opcional para compatibilidad. */
  categoriaId?: number;
  descripcion?: string;
  valor: number;
}
export interface NuevoPedido {
  proveedorId: number;
  bodegaId: number;
  fecha: string;
  observaciones?: string;
  lineas: LineaPedido[];
  costos: CostoPedido[];
}

export async function listarPedidos(empresaId: number) {
  return db
    .select({
      pedido: pedidos,
      proveedor: terceros.razonSocial,
    })
    .from(pedidos)
    .innerJoin(terceros, eq(pedidos.proveedorId, terceros.id))
    .where(eq(pedidos.empresaId, empresaId))
    .orderBy(desc(pedidos.createdAt));
}

export interface PedidoProveedor {
  id: number;
  numero: string;
  fecha: string;
  estado: string;
  total: number;
}

/** Pedidos/compras de un proveedor específico (más recientes primero). */
export async function pedidosDeProveedor(empresaId: number, proveedorId: number): Promise<PedidoProveedor[]> {
  const rows = await db
    .select({ id: pedidos.id, numero: pedidos.numero, fecha: pedidos.fecha, estado: pedidos.estado, total: pedidos.total })
    .from(pedidos)
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidos.proveedorId, proveedorId)))
    .orderBy(desc(pedidos.fecha), desc(pedidos.id));
  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

export async function obtenerPedido(empresaId: number, id: number) {
  const [p] = await db
    .select()
    .from(pedidos)
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidos.id, id)))
    .limit(1);
  if (!p) return null;
  const detalles = await db.select().from(pedidoDetalles).where(eq(pedidoDetalles.pedidoId, id));
  const costos = await db.select().from(pedidoCostos).where(eq(pedidoCostos.pedidoId, id));
  return { ...p, detalles, costos };
}

async function siguienteNumero(empresaId: number): Promise<string> {
  const [{ c }] = await db
    .select({ c: count() })
    .from(pedidos)
    .where(eq(pedidos.empresaId, empresaId));
  return formatearNumero("PED", Number(c) + 1);
}

export async function crearPedido(data: NuevoPedido, ctx: Contexto): Promise<Pedido> {
  const numero = await siguienteNumero(ctx.empresaId);
  const lineasConSub = data.lineas.map((l) => ({
    ...l,
    subtotal: l.cantidad * l.precioUnitario,
  }));
  const subtotal = lineasConSub.reduce((a, l) => a + l.subtotal, 0);
  const costosAdicionales = data.costos.reduce((a, c) => a + c.valor, 0);
  const total = subtotal + costosAdicionales;

  return db.transaction(async (tx) => {
    const [pedido] = await tx
      .insert(pedidos)
      .values({
        empresaId: ctx.empresaId,
        proveedorId: data.proveedorId,
        bodegaId: data.bodegaId,
        numero,
        fecha: data.fecha,
        estado: "borrador",
        subtotal: String(subtotal),
        costosAdicionales: String(costosAdicionales),
        total: String(total),
        observaciones: data.observaciones || null,
        usuarioCreaId: ctx.usuarioId,
      })
      .returning();

    if (lineasConSub.length) {
      await tx.insert(pedidoDetalles).values(
        lineasConSub.map((l) => ({
          pedidoId: pedido.id,
          productoId: l.productoId,
          unidadId: l.unidadId,
          cantidad: String(l.cantidad),
          precioUnitario: String(l.precioUnitario),
          subtotal: String(l.subtotal),
        })),
      );
    }
    if (data.costos.length) {
      await tx.insert(pedidoCostos).values(
        data.costos.map((c) => ({
          pedidoId: pedido.id,
          categoriaId: c.categoriaId ?? null,
          tipo: c.tipo,
          descripcion: c.descripcion || null,
          valor: String(c.valor),
        })),
      );
    }

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx13",
        modelId: pedido.id,
        accion: "CREAR",
        registroNuevo: pedido,
        ipOrigen: ctx.ip,
      },
      tx,
    );
    return pedido;
  });
}

export async function confirmarPedido(id: number, ctx: Contexto): Promise<void> {
  await db
    .update(pedidos)
    .set({ estado: "confirmado", updatedAt: new Date() })
    .where(and(eq(pedidos.empresaId, ctx.empresaId), eq(pedidos.id, id), eq(pedidos.estado, "borrador")));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx13",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { estado: "confirmado" },
    ipOrigen: ctx.ip,
  });
}

export class PedidoNoRecibible extends Error {}

/**
 * Recibe el pedido al inventario: aplica costo promedio ponderado por producto,
 * genera movimientos de entrada y crea la cuenta por pagar. Todo transaccional.
 */
export async function recibirPedido(
  id: number,
  ctx: Contexto,
  recepciones?: Record<number, number>, // detalleId -> cantidad recibida (en la unidad de la línea)
): Promise<void> {
  const pedido = await obtenerPedido(ctx.empresaId, id);
  if (!pedido) throw new PedidoNoRecibible("Pedido no encontrado.");
  if (!["borrador", "confirmado", "parcial"].includes(pedido.estado)) {
    throw new PedidoNoRecibible("El pedido ya fue recibido o está cancelado.");
  }
  if (pedido.detalles.length === 0) {
    throw new PedidoNoRecibible("El pedido no tiene líneas para recibir.");
  }

  // Datos de apoyo: unidad base de cada producto y factores de conversión.
  const productoIds = [...new Set(pedido.detalles.map((d) => d.productoId))];
  const prods = await db
    .select({ id: productos.id, unidadBaseId: productos.unidadBaseId })
    .from(productos)
    .where(inArray(productos.id, productoIds));
  const baseDe = new Map(prods.map((p) => [p.id, p.unidadBaseId]));

  const unidadesProd = await db
    .select()
    .from(productoUnidades)
    .where(inArray(productoUnidades.productoId, productoIds));
  const factorDe = new Map(
    unidadesProd.map((u) => [`${u.productoId}:${u.unidadId}`, Number(u.factorConversion)]),
  );

  const subtotales = pedido.detalles.map((d) => Number(d.subtotal));
  const prorrateo = prorratearCostos(subtotales, Number(pedido.costosAdicionales));

  const [prov] = await db
    .select({ dias: terceros.diasCreditoProveedor })
    .from(terceros)
    .where(eq(terceros.id, pedido.proveedorId))
    .limit(1);
  const diasCredito = prov?.dias ?? 0;

  await db.transaction(async (tx) => {
    for (let i = 0; i < pedido.detalles.length; i++) {
      const d = pedido.detalles[i];
      const cantidad = recepciones ? (recepciones[d.id] ?? 0) : Number(d.cantidad);
      if (cantidad <= 0) continue; // línea no recibida
      const esBase = d.unidadId === baseDe.get(d.productoId);
      const factor = esBase ? 1 : factorDe.get(`${d.productoId}:${d.unidadId}`) ?? 1;
      const cantidadBase = cantidadEnBase(cantidad, factor);
      const costoTotalLinea = Number(d.subtotal) + prorrateo[i];
      const costoUnitBase = costoUnitarioBase(costoTotalLinea, cantidadBase);

      const [inv] = await tx
        .select()
        .from(inventario)
        .where(
          and(
            eq(inventario.empresaId, ctx.empresaId),
            eq(inventario.bodegaId, pedido.bodegaId),
            eq(inventario.productoId, d.productoId),
          ),
        )
        .limit(1);

      const actualCant = inv ? Number(inv.cantidadActual) : 0;
      const actualCosto = inv ? Number(inv.costoPromedio) : 0;
      const r = costoPromedioPonderado(actualCant, actualCosto, cantidadBase, costoUnitBase);

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
          bodegaId: pedido.bodegaId,
          productoId: d.productoId,
          cantidadActual: String(r.cantidad),
          costoPromedio: String(r.costoPromedio),
          valorTotal: String(r.cantidad * r.costoPromedio),
          ultimaActualizacion: new Date(),
        });
      }

      await tx.insert(movimientosInventario).values({
        empresaId: ctx.empresaId,
        bodegaId: pedido.bodegaId,
        productoId: d.productoId,
        pedidoId: pedido.id,
        tipo: "entrada",
        cantidad: String(cantidadBase),
        costoUnitario: String(costoUnitBase),
        referencia: pedido.numero,
        usuarioId: ctx.usuarioId,
      });

      await tx
        .update(pedidoDetalles)
        .set({ cantidadRecibida: String(cantidad) })
        .where(eq(pedidoDetalles.id, d.id));
    }

    // Valor realmente recibido (líneas recibidas a su precio + costos adicionales si recepción total).
    const totalRecibido =
      pedido.detalles.reduce((acc, d) => {
        const cant = recepciones ? (recepciones[d.id] ?? 0) : Number(d.cantidad);
        return acc + cant * Number(d.precioUnitario);
      }, 0) + (recepciones ? 0 : Number(pedido.costosAdicionales));
    const valorCxP = recepciones ? totalRecibido : Number(pedido.total);

    await tx.insert(cuentasPorPagar).values({
      empresaId: ctx.empresaId,
      proveedorId: pedido.proveedorId,
      pedidoId: pedido.id,
      numeroFactura: pedido.numero,
      fechaFactura: pedido.fecha,
      fechaVencimiento: sumarDias(pedido.fecha, diasCredito),
      valorTotal: String(valorCxP),
      saldoPendiente: String(valorCxP),
    });

    const completo = !recepciones || pedido.detalles.every((d) => (recepciones[d.id] ?? 0) >= Number(d.cantidad));
    await tx
      .update(pedidos)
      .set({
        estado: completo ? "recibido" : "parcial",
        fechaRecepcion: new Date(),
        usuarioRecibeId: ctx.usuarioId,
        updatedAt: new Date(),
      })
      .where(eq(pedidos.id, pedido.id));

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx13",
        modelId: pedido.id,
        accion: "ACTUALIZAR",
        registroNuevo: { estado: completo ? "recibido" : "parcial" },
        ipOrigen: ctx.ip,
      },
      tx,
    );
  });
}

/** Proveedor del último pedido que incluyó este producto (más reciente). */
export async function ultimoProveedorDeProducto(empresaId: number, productoId: number): Promise<number | null> {
  const [row] = await db
    .select({ proveedorId: pedidos.proveedorId })
    .from(pedidoDetalles)
    .innerJoin(pedidos, eq(pedidoDetalles.pedidoId, pedidos.id))
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidoDetalles.productoId, productoId)))
    .orderBy(desc(pedidos.fechaRecepcion), desc(pedidos.id))
    .limit(1);
  return row?.proveedorId ?? null;
}
