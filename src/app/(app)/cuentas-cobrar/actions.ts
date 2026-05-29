"use server";

import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseAbonoForm } from "@/lib/validation/abono";
import { registrarRecaudo, AbonoInvalido } from "@/lib/services/cartera";

export interface AbonoState {
  error?: string;
  ok?: boolean;
}

export async function registrarRecaudoAction(_prev: AbonoState, form: FormData): Promise<AbonoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "recaudos.crear")) return { error: "No tienes permiso." };

  const parsed = parseAbonoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    await registrarRecaudo(
      parsed.data.cuentaId,
      {
        valor: parsed.data.valor,
        metodoPago: parsed.data.metodoPago,
        referencia: parsed.data.referencia,
        fecha: parsed.data.fecha,
      },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof AbonoInvalido) return { error: e.message };
    console.error("[cuentas-cobrar] error:", e);
    return { error: "No se pudo registrar el recaudo." };
  }
  revalidatePath("/cuentas-cobrar");
  revalidatePath("/recaudos");
  return { ok: true };
}
