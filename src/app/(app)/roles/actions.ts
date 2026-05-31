"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { crearRol, guardarPermisosRol, RolInvalido } from "@/lib/services/roles";
import { rolNombreSchema } from "@/lib/validation/rol";

export interface RolState {
  error?: string;
  ok?: boolean;
}

export async function guardarPermisosAction(
  rolId: number,
  _prev: RolState,
  form: FormData,
): Promise<RolState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa." };
  if (!puede(c.permisos, "roles.editar")) return { error: "No tienes permiso." };
  let permisos: string[] = [];
  try {
    permisos = JSON.parse(String(form.get("permisosJson") ?? "[]"));
  } catch {
    /* ignore */
  }
  try {
    await guardarPermisosRol(rolId, permisos, c.ctx);
  } catch (e) {
    if (e instanceof RolInvalido) return { error: e.message };
    console.error("[roles]", e);
    return { error: "No se pudo guardar." };
  }
  revalidatePath("/roles");
  revalidatePath(`/roles/${rolId}`);
  return { ok: true };
}

export async function crearRolAction(_prev: RolState, form: FormData): Promise<RolState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa." };
  if (!puede(c.permisos, "roles.crear")) return { error: "No tienes permiso." };
  const parsed = rolNombreSchema.safeParse(form.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let permisos: string[] = [];
  try {
    permisos = JSON.parse(String(form.get("permisosJson") ?? "[]"));
  } catch {
    /* ignore */
  }
  let id: number;
  try {
    id = await crearRol(parsed.data, permisos, c.ctx);
  } catch (e) {
    if (e instanceof RolInvalido) return { error: e.message };
    console.error("[roles]", e);
    return { error: "No se pudo crear el rol." };
  }
  revalidatePath("/roles");
  redirect(`/roles/${id}`);
}
