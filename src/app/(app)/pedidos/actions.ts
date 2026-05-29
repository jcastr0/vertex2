"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth/cookies";
import { puede } from "@/lib/auth/roles";
import { parsePedidoForm } from "@/lib/validation/pedido";
import {
  crearPedido,
  confirmarPedido,
  recibirPedido,
  PedidoNoRecibible,
} from "@/lib/services/pedidos";
import type { Contexto } from "@/lib/services/bodegas";

export interface PedidoState {
  error?: string;
}

async function contexto(): Promise<{ ctx: Contexto; rol: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion || sesion.empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { rol: sesion.rol, ctx: { empresaId: sesion.empresaId, usuarioId: sesion.uid, ip } };
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
