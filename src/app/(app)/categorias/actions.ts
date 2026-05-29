"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth/cookies";
import { puede, type Permiso } from "@/lib/auth/roles";
import { parseCategoriaForm } from "@/lib/validation/categoria";
import {
  crearCategoria,
  actualizarCategoria,
  cambiarEstadoCategoria,
} from "@/lib/services/categorias";
import type { Contexto } from "@/lib/services/bodegas";

export interface CategoriaState {
  error?: string;
}

async function contexto(): Promise<{ ctx: Contexto; rol: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion || sesion.empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { rol: sesion.rol, ctx: { empresaId: sesion.empresaId, usuarioId: sesion.uid, ip } };
}

export async function guardarCategoriaAction(
  _prev: CategoriaState,
  form: FormData,
): Promise<CategoriaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };

  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "categorias.editar" : "categorias.crear";
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso para esta acción." };

  const parsed = parseCategoriaForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    if (editando) await actualizarCategoria(editando, parsed.data, c.ctx);
    else await crearCategoria(parsed.data, c.ctx);
  } catch (e) {
    console.error("[categorias] error al guardar:", e);
    return { error: "Ocurrió un error al guardar la categoría." };
  }

  revalidatePath("/categorias");
  redirect("/categorias");
}

export async function cambiarEstadoCategoriaAction(id: number, activo: boolean): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.rol, activo ? "categorias.editar" : "categorias.eliminar")) return;
  await cambiarEstadoCategoria(id, activo, c.ctx);
  revalidatePath("/categorias");
}
