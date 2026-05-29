"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseTrasladoForm } from "@/lib/validation/traslado";
import {
  crearTraslado,
  enviarTraslado,
  recibirTraslado,
  TrasladoInvalido,
} from "@/lib/services/traslados";

export interface TrasladoState {
  error?: string;
}

export async function crearTrasladoAction(_prev: TrasladoState, form: FormData): Promise<TrasladoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "traslados.crear")) return { error: "No tienes permiso." };

  const parsed = parseTrasladoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let id: number;
  try {
    id = await crearTraslado(parsed.data, c.ctx);
  } catch (e) {
    console.error("[traslados] crear:", e);
    return { error: "No se pudo crear el traslado." };
  }
  revalidatePath("/traslados");
  redirect(`/traslados/${id}`);
}

export async function enviarTrasladoAction(id: number): Promise<{ error?: string }> {
  const c = await contexto();
  if (!c || !puede(c.rol, "traslados.editar")) return { error: "Sin permiso." };
  try {
    await enviarTraslado(id, c.ctx);
  } catch (e) {
    if (e instanceof TrasladoInvalido) return { error: e.message };
    return { error: "No se pudo enviar." };
  }
  revalidatePath(`/traslados/${id}`);
  revalidatePath("/inventario");
  return {};
}

export async function recibirTrasladoAction(id: number): Promise<{ error?: string }> {
  const c = await contexto();
  if (!c || !puede(c.rol, "traslados.editar")) return { error: "Sin permiso." };
  try {
    await recibirTraslado(id, c.ctx);
  } catch (e) {
    if (e instanceof TrasladoInvalido) return { error: e.message };
    return { error: "No se pudo recibir." };
  }
  revalidatePath(`/traslados/${id}`);
  revalidatePath("/inventario");
  return {};
}
