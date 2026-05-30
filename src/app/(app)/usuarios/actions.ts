"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseUsuarioForm } from "@/lib/validation/usuario";
import { crearUsuario, actualizarUsuario, cambiarEstadoUsuario, ConflictoUsuario } from "@/lib/services/usuarios";

export interface UsuarioState {
  error?: string;
}

export async function guardarUsuarioAction(_prev: UsuarioState, form: FormData): Promise<UsuarioState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "usuarios.editar" : "usuarios.crear";
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso." };

  const parsed = parseUsuarioForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    if (editando) await actualizarUsuario(editando, parsed.data, c.ctx);
    else await crearUsuario(parsed.data, c.ctx);
  } catch (e) {
    if (e instanceof ConflictoUsuario) return { error: e.message };
    console.error("[usuarios] error:", e);
    return { error: "No se pudo guardar el usuario." };
  }
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function cambiarEstadoUsuarioAction(id: number, activo: boolean): Promise<void> {
  const c = await contexto();
  if (!c || !puede(c.rol, "usuarios.editar")) return;
  await cambiarEstadoUsuario(id, activo, c.ctx);
  revalidatePath("/usuarios");
}
