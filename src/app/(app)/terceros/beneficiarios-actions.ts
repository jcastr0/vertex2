"use server";

import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseBeneficiarioForm } from "@/lib/validation/beneficiario";
import { crearBeneficiario, cambiarEstadoBeneficiario } from "@/lib/services/beneficiarios";

export interface BeneficiarioState { error?: string; ok?: boolean }

export async function agregarBeneficiarioAction(terceroId: number, _prev: BeneficiarioState, form: FormData): Promise<BeneficiarioState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "terceros.editar")) return { error: "No tienes permiso." };
  const parsed = parseBeneficiarioForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    await crearBeneficiario(terceroId, parsed.data, c.ctx);
  } catch (e) {
    console.error("[beneficiarios] error:", e);
    return { error: "No se pudo guardar la cuenta." };
  }
  revalidatePath(`/terceros/${terceroId}`);
  revalidatePath(`/terceros/${terceroId}/editar`);
  return { ok: true };
}

export async function quitarBeneficiarioAction(terceroId: number, id: number): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.rol, "terceros.editar")) return;
  await cambiarEstadoBeneficiario(id, false, c.ctx);
  revalidatePath(`/terceros/${terceroId}`);
  revalidatePath(`/terceros/${terceroId}/editar`);
}
