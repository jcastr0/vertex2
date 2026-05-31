"use server";

import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { recaudarEnRuta, registrarVisita, asignarRecaudo, RutaError } from "@/lib/services/ruta-recaudo";
import { AbonoInvalido } from "@/lib/services/cartera";
import { subirEvidencia } from "@/lib/storage";

export interface RutaState {
  error?: string;
  ok?: boolean;
}

export interface AsignarState {
  error?: string;
  ok?: boolean;
  asignados?: number;
}

/** Programa (o reprograma) recaudador + día para varios clientes a la vez. */
export async function asignarRecaudoAction(_prev: AsignarState, form: FormData): Promise<AsignarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "ruta_recaudo.editar")) return { error: "No tienes permiso para programar la ruta." };

  let clienteIds: number[] = [];
  try {
    clienteIds = (JSON.parse(String(form.get("clienteIds") ?? "[]")) as number[]).filter((n) => Number.isInteger(n));
  } catch { /* ignore */ }
  if (clienteIds.length === 0) return { error: "Selecciona al menos un cliente." };

  const recRaw = String(form.get("recaudadorId") ?? "");
  const diaRaw = String(form.get("diaCobro") ?? "");
  const recaudadorId = recRaw && recRaw !== "0" ? Number(recRaw) : null;
  const diaCobro = diaRaw && diaRaw !== "0" ? Number(diaRaw) : null;

  try {
    const n = await asignarRecaudo(c.ctx.empresaId, clienteIds, recaudadorId, diaCobro, c.ctx);
    revalidatePath("/ruta-recaudo");
    revalidatePath("/ruta-recaudo/asignar");
    return { ok: true, asignados: n };
  } catch (e) {
    console.error("[ruta] asignar:", e);
    return { error: "No se pudo programar la ruta." };
  }
}

export async function recaudarRutaAction(_prev: RutaState, form: FormData): Promise<RutaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "recaudos.crear")) return { error: "No tienes permiso para recaudar." };

  const clienteId = Number(form.get("clienteId"));
  const recaudadorId = Number(form.get("recaudadorId"));
  const valor = Number(form.get("valor"));
  const metodoPago = String(form.get("metodoPago") || "efectivo");
  const referencia = String(form.get("referencia") || "");
  const fecha = String(form.get("fecha") || "");
  if (!clienteId || !recaudadorId || !(valor > 0) || !fecha) return { error: "Datos incompletos." };

  try {
    await recaudarEnRuta(clienteId, recaudadorId, { valor, metodoPago, referencia, fecha }, c.ctx);
  } catch (e) {
    if (e instanceof RutaError || e instanceof AbonoInvalido) return { error: e.message };
    console.error("[ruta-recaudo] recaudar:", e);
    return { error: "No se pudo registrar el recaudo." };
  }
  revalidatePath("/ruta-recaudo");
  revalidatePath("/cuentas-cobrar");
  return { ok: true };
}

export async function marcarVisitaAction(_prev: RutaState, form: FormData): Promise<RutaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "recaudos.crear")) return { error: "No tienes permiso." };

  const clienteId = Number(form.get("clienteId"));
  const recaudadorId = Number(form.get("recaudadorId"));
  const resultado = String(form.get("resultado") || "");
  const fecha = String(form.get("fecha") || "");
  const observaciones = String(form.get("observaciones") || "") || null;
  if (!clienteId || !recaudadorId || !["no_estaba", "no_quiso"].includes(resultado) || !fecha) {
    return { error: "Datos incompletos." };
  }

  let fotoUrl: string | null = null;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) {
    try {
      const ext = (foto.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      fotoUrl = await subirEvidencia(foto, `${c.ctx.empresaId}/${recaudadorId}/${clienteId}-${Date.now()}.${ext}`);
    } catch (e) {
      console.error("[ruta-recaudo] foto:", e);
      return { error: "No se pudo subir la foto. Intenta de nuevo." };
    }
  }

  try {
    await registrarVisita(clienteId, recaudadorId, resultado, fecha, fotoUrl, observaciones, c.ctx);
  } catch (e) {
    console.error("[ruta-recaudo] visita:", e);
    return { error: "No se pudo registrar la visita." };
  }
  revalidatePath("/ruta-recaudo");
  return { ok: true };
}
