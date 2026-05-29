"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parsePedidoForm } from "@/lib/validation/pedido";
import {
  crearPedido,
  confirmarPedido,
  recibirPedido,
  PedidoNoRecibible,
} from "@/lib/services/pedidos";

export interface PedidoState {
  error?: string;
}

export async function crearPedidoAction(
  _prev: PedidoState,
  form: FormData,
): Promise<PedidoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "pedidos.crear")) return { error: "No tienes permiso para crear pedidos." };

  const parsed = parsePedidoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let nuevoId: number;
  try {
    const pedido = await crearPedido(
      {
        proveedorId: parsed.data.proveedorId,
        bodegaId: parsed.data.bodegaId,
        fecha: parsed.data.fecha,
        observaciones: parsed.data.observaciones,
        lineas: parsed.data.lineas,
        costos: parsed.data.costos,
      },
      c.ctx,
    );
    nuevoId = pedido.id;
  } catch (e) {
    console.error("[pedidos] error al crear:", e);
    return { error: "Ocurrió un error al crear el pedido." };
  }
  revalidatePath("/pedidos");
  redirect(`/pedidos/${nuevoId}`);
}

export async function confirmarPedidoAction(id: number): Promise<void> {
  const c = await contexto();
  if (!c || !puede(c.rol, "pedidos.editar")) return;
  await confirmarPedido(id, c.ctx);
  revalidatePath(`/pedidos/${id}`);
}

export async function recibirPedidoAction(id: number): Promise<{ error?: string }> {
  const c = await contexto();
  if (!c || !puede(c.rol, "pedidos.editar")) return { error: "Sin permiso." };
  try {
    await recibirPedido(id, c.ctx);
  } catch (e) {
    if (e instanceof PedidoNoRecibible) return { error: e.message };
    console.error("[pedidos] error al recibir:", e);
    return { error: "No se pudo recibir el pedido." };
  }
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/inventario");
  return {};
}
