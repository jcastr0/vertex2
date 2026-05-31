"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { crearNotaCreditoManual, facturasConSaldoDeCliente, NotaCreditoInvalida } from "@/lib/services/notas-credito";

export interface NotaCreditoState {
  error?: string;
}

/** Facturas con saldo de un cliente (para elegir a cuál se le hace la NC). */
export async function facturasConSaldoAction(clienteId: number) {
  const c = await contexto();
  if (!c || !clienteId) return [];
  return facturasConSaldoDeCliente(c.ctx.empresaId, clienteId);
}

export async function guardarNotaCreditoAction(_prev: NotaCreditoState, form: FormData): Promise<NotaCreditoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "notas_credito.crear")) return { error: "No tienes permiso para crear notas crédito." };

  const clienteId = Number(form.get("clienteId"));
  const facturaId = Number(form.get("facturaId"));
  const valor = Number(form.get("valor"));
  const motivo = String(form.get("motivo") || "").trim();
  const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
  if (!clienteId) return { error: "Elige el cliente." };
  if (!facturaId) return { error: "Elige la factura." };
  if (!motivo) return { error: "Escribe el motivo." };

  let nuevoId: number;
  try {
    nuevoId = await crearNotaCreditoManual({ clienteId, facturaId, fecha, motivo, valor }, c.ctx);
  } catch (e) {
    if (e instanceof NotaCreditoInvalida) return { error: e.message };
    console.error("[notas-credito] error al crear:", e);
    return { error: "Ocurrió un error al crear la nota crédito." };
  }
  revalidatePath("/notas-credito");
  revalidatePath("/cuentas-cobrar");
  redirect(`/notas-credito?nueva=${nuevoId}`);
}
