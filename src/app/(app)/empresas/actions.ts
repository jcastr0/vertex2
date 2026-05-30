"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth/cookies";
import { parseEmpresaForm } from "@/lib/validation/empresa";
import { crearEmpresa, actualizarEmpresa, cambiarEstadoEmpresa, ConflictoEmpresa } from "@/lib/services/empresas";

export interface EmpresaState {
  error?: string;
}

async function ctxSistema(): Promise<{ usuarioId: number; ip: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion || !sesion.esSuperadmin) return null;
  const h = await headers();
  return { usuarioId: sesion.uid, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null };
}

export async function guardarEmpresaAction(_prev: EmpresaState, form: FormData): Promise<EmpresaState> {
  const ctx = await ctxSistema();
  if (!ctx) return { error: "Solo el superadministrador gestiona empresas." };

  const parsed = parseEmpresaForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  try {
    if (editando) await actualizarEmpresa(editando, parsed.data, ctx);
    else await crearEmpresa(parsed.data, ctx);
  } catch (e) {
    if (e instanceof ConflictoEmpresa) return { error: e.message };
    console.error("[empresas] error:", e);
    return { error: "No se pudo guardar la empresa." };
  }
  revalidatePath("/empresas");
  redirect("/empresas");
}

export async function cambiarEstadoEmpresaAction(id: number, activa: boolean): Promise<void> {
  const ctx = await ctxSistema();
  if (!ctx) return;
  await cambiarEstadoEmpresa(id, activa, ctx);
  revalidatePath("/empresas");
}
