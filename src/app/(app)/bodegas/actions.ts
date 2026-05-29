"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth/cookies";
import { puede, type Permiso } from "@/lib/auth/roles";
import { parseBodegaForm } from "@/lib/validation/bodega";
import {
  crearBodega,
  actualizarBodega,
  cambiarEstadoBodega,
  ConflictoCodigo,
  type Contexto,
} from "@/lib/services/bodegas";

export interface BodegaState {
  error?: string;
}

async function contexto(): Promise<{ ctx: Contexto; rol: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion || sesion.empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return {
    rol: sesion.rol,
    ctx: { empresaId: sesion.empresaId, usuarioId: sesion.uid, ip },
  };
}

export async function guardarBodegaAction(
  _prev: BodegaState,
  form: FormData,
): Promise<BodegaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };

  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "bodegas.editar" : "bodegas.crear";
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso para esta acción." };

  const parsed = parseBodegaForm(form);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    if (editando) {
      await actualizarBodega(editando, parsed.data, c.ctx);
    } else {
      await crearBodega(parsed.data, c.ctx);
    }
  } catch (e) {
    if (e instanceof ConflictoCodigo) return { error: e.message };
    console.error("[bodegas] error al guardar:", e);
    return { error: "Ocurrió un error al guardar la bodega." };
  }

  revalidatePath("/bodegas");
  redirect("/bodegas");
}

export async function cambiarEstadoBodegaAction(id: number, activo: boolean): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.rol, activo ? "bodegas.editar" : "bodegas.eliminar")) return;
  await cambiarEstadoBodega(id, activo, c.ctx);
  revalidatePath("/bodegas");
}
