"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseCuentaPropiaForm } from "@/lib/validation/cuenta-propia";
import { parseMovimientoForm } from "@/lib/validation/movimiento-tesoreria";
import { crearCuentaPropia, actualizarCuentaPropia, registrarMovimientoManual } from "@/lib/services/tesoreria";

export interface TesoreriaState {
  error?: string;
}

export async function guardarCuentaAction(_prev: TesoreriaState, form: FormData): Promise<TesoreriaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "tesoreria.editar" : "tesoreria.crear";
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso para esta acción." };
  const parsed = parseCuentaPropiaForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    if (editando) await actualizarCuentaPropia(editando, parsed.data, c.ctx);
    else await crearCuentaPropia(parsed.data, c.ctx);
  } catch (e) {
    console.error("[tesoreria] error al guardar cuenta:", e);
    return { error: "Ocurrió un error al guardar la cuenta." };
  }
  revalidatePath("/tesoreria");
  redirect("/tesoreria");
}

export interface MovimientoState {
  error?: string;
  ok?: boolean;
}

export async function registrarMovimientoAction(_prev: MovimientoState, form: FormData): Promise<MovimientoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "tesoreria.crear")) return { error: "No tienes permiso para esta acción." };
  const parsed = parseMovimientoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    await registrarMovimientoManual(parsed.data, c.ctx);
  } catch (e) {
    console.error("[tesoreria] error al registrar movimiento:", e);
    return { error: "Ocurrió un error al registrar el movimiento." };
  }
  revalidatePath("/tesoreria");
  revalidatePath(`/tesoreria/${parsed.data.cuentaPropiaId}`);
  return { ok: true };
}
