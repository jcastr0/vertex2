"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseCotizacionForm, parseFacturarForm } from "@/lib/validation/cotizacion";
import { crearCotizacion, anularCotizacion, facturarCotizacion, CotizacionInvalida } from "@/lib/services/cotizaciones";
import { ultimoPrecioPorCliente } from "@/lib/services/facturas";

export interface CotizacionState {
  error?: string;
}

export async function crearCotizacionAction(_prev: CotizacionState, form: FormData): Promise<CotizacionState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso para crear cotizaciones." };

  const parsed = parseCotizacionForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let nuevoId: number;
  try {
    nuevoId = await crearCotizacion(
      { clienteId: parsed.data.clienteId, fecha: parsed.data.fecha, observaciones: parsed.data.observaciones, lineas: parsed.data.lineas },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof CotizacionInvalida) return { error: e.message };
    console.error("[cotizaciones] error al crear:", e);
    return { error: "Ocurrió un error al crear la cotización." };
  }
  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${nuevoId}`);
}

/** Precios sugeridos: último precio vendido a ESE cliente por producto. */
export async function preciosClienteAction(clienteId: number): Promise<Record<number, number>> {
  const c = await contexto();
  if (!c || !clienteId) return {};
  return ultimoPrecioPorCliente(c.ctx.empresaId, clienteId);
}

export interface AnularCotState {
  ok?: boolean;
  error?: string;
}
export async function anularCotizacionAction(id: number, _prev: AnularCotState, form: FormData): Promise<AnularCotState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.editar")) return { error: "No tienes permiso." };
  const motivo = String(form.get("motivo") || "").trim();
  if (!motivo) return { error: "Indica el motivo." };
  try {
    await anularCotizacion(c.ctx.empresaId, id, motivo, c.ctx);
  } catch (e) {
    if (e instanceof CotizacionInvalida) return { error: e.message };
    console.error("[cotizaciones] error al anular:", e);
    return { error: "No se pudo anular." };
  }
  revalidatePath(`/cotizaciones/${id}`);
  return { ok: true };
}

export interface FacturarState {
  error?: string;
}
export async function facturarCotizacionAction(id: number, _prev: FacturarState, form: FormData): Promise<FacturarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "facturas.crear")) return { error: "No tienes permiso para facturar." };

  const parsed = parseFacturarForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let metodoPago: string | undefined;
  let cuentaDestinoId: number | undefined;
  if (parsed.data.tipoVenta === "contado") {
    metodoPago = String(form.get("metodoPago") || "efectivo");
    cuentaDestinoId = Number(form.get("cuentaDestinoId")) || undefined;
    if (!cuentaDestinoId) return { error: "Elige a dónde entró el dinero." };
  }

  let facturaId: number;
  try {
    facturaId = await facturarCotizacion(
      c.ctx.empresaId,
      id,
      { bodegaId: parsed.data.bodegaId, fecha: parsed.data.fecha, tipoVenta: parsed.data.tipoVenta, lineas: parsed.data.lineas, metodoPago, cuentaDestinoId },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof CotizacionInvalida) return { error: e.message };
    if (e instanceof Error && e.name === "VentaInvalida") return { error: e.message };
    console.error("[cotizaciones] error al facturar:", e);
    return { error: "No se pudo facturar la cotización." };
  }
  revalidatePath("/cotizaciones");
  revalidatePath("/inventario");
  redirect(`/facturas/${facturaId}`);
}
