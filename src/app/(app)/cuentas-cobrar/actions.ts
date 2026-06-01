"use server";

import { revalidatePath } from "next/cache";
import { hoyColombia } from "@/lib/fecha";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseAbonoForm } from "@/lib/validation/abono";
import { registrarRecaudo, cobrarACliente, AbonoInvalido } from "@/lib/services/cartera";

export interface AbonoState {
  error?: string;
  ok?: boolean;
}

/** Registra cuánto pagó un cliente (se reparte FIFO entre sus deudas). */
export async function cobrarClienteAction(clienteId: number, _prev: AbonoState, form: FormData): Promise<AbonoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "recaudos.crear")) return { error: "No tienes permiso." };

  const monto = Number(form.get("monto"));
  if (!monto || monto <= 0) return { error: "Escribe cuánto te pagó." };
  const metodoPago = String(form.get("metodoPago") || "efectivo");
  const fecha = String(form.get("fecha") || hoyColombia());
  const cuentaDestinoId = Number(form.get("cuentaDestinoId")) || undefined;
  if (!cuentaDestinoId) return { error: "Elige a dónde entró el dinero." };

  try {
    await cobrarACliente(clienteId, { monto, metodoPago, fecha, cuentaDestinoId }, c.ctx);
  } catch (e) {
    if (e instanceof AbonoInvalido) return { error: e.message };
    console.error("[cobrar] error:", e);
    return { error: "No se pudo registrar el cobro." };
  }
  revalidatePath("/cuentas-cobrar");
  revalidatePath("/recaudos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function registrarRecaudoAction(_prev: AbonoState, form: FormData): Promise<AbonoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "recaudos.crear")) return { error: "No tienes permiso." };

  const parsed = parseAbonoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const cuentaDestinoId = Number(form.get("cuentaDestinoId")) || undefined;
  if (!cuentaDestinoId) return { error: "Elige la cuenta destino." };

  try {
    await registrarRecaudo(
      parsed.data.cuentaId,
      {
        valor: parsed.data.valor,
        metodoPago: parsed.data.metodoPago,
        referencia: parsed.data.referencia,
        fecha: parsed.data.fecha,
        cuentaDestinoId,
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
