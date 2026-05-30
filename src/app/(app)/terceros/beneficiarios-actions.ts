"use server";

import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { beneficiarioSchema } from "@/lib/validation/beneficiario";
import { resolverTitular } from "@/lib/domain/beneficiario";
import { crearBeneficiario, cambiarEstadoBeneficiario } from "@/lib/services/beneficiarios";

export interface BeneficiarioState { error?: string; ok?: boolean }

export async function agregarBeneficiarioAction(terceroId: number, _prev: BeneficiarioState, form: FormData): Promise<BeneficiarioState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "terceros.editar")) return { error: "No tienes permiso." };

  // El titular es el mismo proveedor (propia) salvo que sea otra persona/empresa.
  const esPropia = form.get("esPropia") !== "false";
  const titular = resolverTitular(
    esPropia,
    { nit: String(form.get("terceroNit") || ""), nombre: String(form.get("terceroNombre") || "") },
    { nit: String(form.get("titularNit") || ""), nombre: String(form.get("titularNombre") || "") },
  );

  const parsed = beneficiarioSchema.safeParse({
    banco: form.get("banco"),
    tipo: form.get("tipo"),
    numeroCuenta: form.get("numeroCuenta"),
    titularNit: titular.nit,
    titularNombre: titular.nombre,
    activa: true,
  });
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
