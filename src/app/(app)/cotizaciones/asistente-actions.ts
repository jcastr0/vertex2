"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoyColombia } from "@/lib/fecha";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { ultimoPedidoCliente } from "@/lib/services/facturas";
import { botActivo } from "@/lib/services/configuracion";
import { interpretarPedido, type ResultadoTurno } from "@/lib/bot/interpretar";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import type { Propuesta } from "@/lib/bot/mapear";

export interface TurnoState {
  mensajeAsistente?: string;
  propuesta?: Propuesta;
  completo?: boolean;
  clienteId?: number;
  error?: string;
}

/** Un turno del chat: interpreta el mensaje (con contexto del cliente) y propone. No escribe. */
export async function enviarMensajeAction(_prev: TurnoState, form: FormData): Promise<TurnoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso." };
  if (!(await botActivo(c.ctx.empresaId))) return { error: "El asistente está desactivado para esta empresa." };

  const clienteId = Number(form.get("clienteId")) || 0;
  if (!clienteId) return { error: "Elige el cliente." };
  const texto = String(form.get("texto") || "").trim();
  const imagenDataUrl = String(form.get("imagenDataUrl") || "").trim();
  if (!texto && !imagenDataUrl) return { error: "Escribe un mensaje o sube una foto." };

  let borradorPrevio: { nombre: string; cantidad: number }[] = [];
  try {
    borradorPrevio = JSON.parse(String(form.get("borradorJson") || "[]"));
  } catch {
    borradorPrevio = [];
  }

  try {
    const [cli, productos, ultimo] = await Promise.all([
      obtenerTercero(c.ctx.empresaId, clienteId),
      listarProductos(c.ctx.empresaId),
      ultimoPedidoCliente(c.ctx.empresaId, clienteId),
    ]);
    const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
    const ultimoPedido = ultimo.map((u) => ({ nombre: prodPorId.get(u.productoId) ?? `#${u.productoId}`, cantidad: u.cantidad }));
    const r: ResultadoTurno = await interpretarPedido(
      c.ctx.empresaId,
      clienteId,
      { texto: texto || undefined, imagenes: imagenDataUrl ? [{ dataUrl: imagenDataUrl }] : [] },
      { clienteNombre: cli?.razonSocial, ultimoPedido, borradorPrevio: borradorPrevio.length ? borradorPrevio : undefined },
    );
    return { mensajeAsistente: r.mensajeAsistente, propuesta: r.propuesta, completo: r.completo, clienteId };
  } catch (e) {
    console.error("[bot] error en turno:", e);
    return { error: "No se pudo procesar. ¿Está configurada la API key?" };
  }
}

export interface ConfirmarState {
  error?: string;
}

/** Crea la cotización pendiente con lo que el cliente confirmó (origen bot, requiere revisión). */
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
