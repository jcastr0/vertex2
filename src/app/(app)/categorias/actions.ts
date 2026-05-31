"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseCategoriaForm } from "@/lib/validation/categoria";
import {
  crearCategoria,
  actualizarCategoria,
  cambiarEstadoCategoria,
} from "@/lib/services/categorias";

export interface CategoriaState {
  error?: string;
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
  if (!puede(c.permisos, permiso)) return { error: "No tienes permiso para esta acción." };

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
  if (!puede(c.permisos, activo ? "categorias.editar" : "categorias.eliminar")) return;
  await cambiarEstadoCategoria(id, activo, c.ctx);
  revalidatePath("/categorias");
}
