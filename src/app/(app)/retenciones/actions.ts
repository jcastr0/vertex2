"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseRetencionForm } from "@/lib/validation/retencion";
import {
  crearRetencion,
  actualizarRetencion,
  cambiarEstadoRetencion,
} from "@/lib/services/retenciones";

export interface RetencionState {
  error?: string;
}

export async function guardarRetencionAction(
  _prev: RetencionState,
  form: FormData,
): Promise<RetencionState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };

  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "retenciones.editar" : "retenciones.crear";
  if (!puede(c.permisos, permiso)) return { error: "No tienes permiso para esta acción." };

  const parsed = parseRetencionForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    if (editando) await actualizarRetencion(editando, parsed.data, c.ctx);
    else await crearRetencion(parsed.data, c.ctx);
  } catch (e) {
    console.error("[retenciones] error al guardar:", e);
    return { error: "Ocurrió un error al guardar la retención." };
  }

  revalidatePath("/retenciones");
  redirect("/retenciones");
}

export async function cambiarEstadoRetencionAction(id: number, activa: boolean): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.permisos, activa ? "retenciones.editar" : "retenciones.eliminar")) return;
  await cambiarEstadoRetencion(id, activa, c.ctx);
  revalidatePath("/retenciones");
}
