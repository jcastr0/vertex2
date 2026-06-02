"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoyColombia } from "@/lib/fecha";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { interpretarPedido } from "@/lib/bot/interpretar";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import type { Propuesta } from "@/lib/bot/mapear";

export interface InterpretarState {
  propuesta?: Propuesta;
  clienteId?: number;
  texto?: string;
  error?: string;
}

export async function interpretarPedidoAction(_prev: InterpretarState, form: FormData): Promise<InterpretarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso." };

  const clienteId = Number(form.get("clienteId")) || 0;
  if (!clienteId) return { error: "Elige el cliente." };
  const texto = String(form.get("texto") || "").trim();
  const imagenDataUrl = String(form.get("imagenDataUrl") || "").trim();
  if (!texto && !imagenDataUrl) return { error: "Escribe el pedido o sube una foto." };

  try {
    const propuesta = await interpretarPedido(c.ctx.empresaId, clienteId, {
      texto: texto || undefined,
      imagenes: imagenDataUrl ? [{ dataUrl: imagenDataUrl }] : [],
    });
    return { propuesta, clienteId, texto };
  } catch (e) {
    console.error("[bot] error al interpretar:", e);
    return { error: "No se pudo interpretar el pedido. ¿Está configurada la API key?" };
  }
}

export interface ConfirmarState {
  error?: string;
}
export async function confirmarPedidoAction(_prev: ConfirmarState, form: FormData): Promise<ConfirmarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso." };

  const clienteId = Number(form.get("clienteId")) || 0;
  let propuesta: Propuesta;
  try {
    propuesta = JSON.parse(String(form.get("propuestaJson") || "")) as Propuesta;
  } catch {
    return { error: "Propuesta inválida." };
  }
  if (!clienteId || propuesta.lineas.length === 0) return { error: "No hay líneas para crear." };

  const texto = String(form.get("texto") || "").trim();
  const obs = [
    "Pedido recibido por el asistente (bot).",
    texto ? `Mensaje del cliente: "${texto}"` : null,
    propuesta.noReconocidos.length ? `No reconocido: ${propuesta.noReconocidos.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  let nuevoId: number;
  try {
    nuevoId = await crearCotizacion(
      {
        clienteId,
        fecha: hoyColombia(),
        observaciones: obs,
        lineas: propuesta.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
        origen: "bot",
        requiereRevision: true,
      },
      c.ctx,
    );
  } catch (e) {
    console.error("[bot] error al crear cotización:", e);
    return { error: "No se pudo crear la cotización." };
  }
  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${nuevoId}`);
}
