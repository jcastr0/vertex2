"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseTerceroForm } from "@/lib/validation/tercero";
import {
  crearTercero,
  actualizarTercero,
  cambiarEstadoTercero,
  ConflictoTercero,
} from "@/lib/services/terceros";

export interface TerceroState {
  error?: string;
}

export async function guardarTerceroAction(
  _prev: TerceroState,
  form: FormData,
): Promise<TerceroState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };

  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "terceros.editar" : "terceros.crear";
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso para esta acción." };

  const parsed = parseTerceroForm(form);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    if (editando) await actualizarTercero(editando, parsed.data, c.ctx);
    else await crearTercero(parsed.data, c.ctx);
  } catch (e) {
    if (e instanceof ConflictoTercero) return { error: e.message };
    console.error("[terceros] error al guardar:", e);
    return { error: "Ocurrió un error al guardar el tercero." };
  }

  revalidatePath("/terceros");
  redirect("/terceros");
}

export async function cambiarEstadoTerceroAction(id: number, activo: boolean): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.rol, activo ? "terceros.editar" : "terceros.eliminar")) return;
  await cambiarEstadoTercero(id, activo, c.ctx);
  revalidatePath("/terceros");
}
