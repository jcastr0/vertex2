"use server";

import { revalidatePath } from "next/cache";
import { hoyColombia } from "@/lib/fecha";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseAbonoForm } from "@/lib/validation/abono";
import { registrarPago, pagarAProveedor, registrarFacturaProveedor, AbonoInvalido } from "@/lib/services/cartera";
import { beneficiariosActivos } from "@/lib/services/beneficiarios";
import { resolverBeneficiario } from "@/lib/domain/tesoreria";

export interface AbonoState {
  error?: string;
  ok?: boolean;
}

export async function registrarPagoAction(_prev: AbonoState, form: FormData): Promise<AbonoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "pagos_proveedor.crear")) return { error: "No tienes permiso." };

  const cuentaOrigenId = Number(form.get("cuentaOrigenId"));
  if (!cuentaOrigenId) return { error: "Elige la cuenta de origen." };

  const destino = String(form.get("destino") ?? "proveedor");
  const beneficiarios = JSON.parse(String(form.get("beneficiariosJson") ?? "[]")) as Array<{ id: number; banco: string; numeroCuenta: string; titularNit: string; titularNombre: string }>;
  let beneficiario = null;
  let guardarBeneficiario = false;
  if (destino.startsWith("cuenta:")) {
    const bid = Number(destino.slice(7));
    const cuenta = beneficiarios.find((b) => b.id === bid);
    if (cuenta) beneficiario = resolverBeneficiario({ opcion: "guardada", cuenta });
  } else if (destino === "adhoc") {
    const adhoc = {
      banco: String(form.get("adhocBanco") ?? ""),
      numeroCuenta: String(form.get("adhocCuenta") ?? ""),
      nit: String(form.get("adhocNit") ?? ""),
      nombre: String(form.get("adhocNombre") ?? ""),
    };
    if (!adhoc.banco || !adhoc.numeroCuenta || !adhoc.nit || !adhoc.nombre) return { error: "Completa los datos del beneficiario." };
    beneficiario = resolverBeneficiario({ opcion: "adhoc", adhoc });
    guardarBeneficiario = form.get("guardarBeneficiario") === "true";
  }

  const parsed = parseAbonoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    await registrarPago(
      parsed.data.cuentaId,
      {
        valor: parsed.data.valor,
        metodoPago: parsed.data.metodoPago,
        referencia: parsed.data.referencia,
        fecha: parsed.data.fecha,
        cuentaOrigenId,
        beneficiario,
        guardarBeneficiario,
      },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof AbonoInvalido) return { error: e.message };
    console.error("[cuentas-pagar] error:", e);
    return { error: "No se pudo registrar el pago." };
  }
  revalidatePath("/cuentas-pagar");
  revalidatePath("/pagos-proveedor");
  return { ok: true };
}

export interface FacturaProvState { error?: string; ok?: boolean }

/** Registra la factura del proveedor sobre una cuenta por pagar. */
export async function registrarFacturaProveedorAction(cuentaPorPagarId: number, _prev: FacturaProvState, form: FormData): Promise<FacturaProvState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "pagos_proveedor.crear")) return { error: "No tienes permiso." };
  const numeroFactura = String(form.get("numeroFactura") || "").trim();
  const fechaFactura = String(form.get("fechaFactura") || "").trim();
  const fechaVencimiento = String(form.get("fechaVencimiento") || "").trim();
  const esElectronica = String(form.get("esElectronica") || "") === "1";
  if (!numeroFactura) return { error: "Escribe el número de la factura del proveedor." };
  if (!fechaFactura || !fechaVencimiento) return { error: "Completa las fechas." };
  try {
    await registrarFacturaProveedor(cuentaPorPagarId, { numeroFactura, fechaFactura, fechaVencimiento, esElectronica }, c.ctx);
  } catch (e) {
    if (e instanceof AbonoInvalido) return { error: e.message };
    console.error("[factura-proveedor] error:", e);
    return { error: "No se pudo registrar la factura." };
  }
  revalidatePath("/cuentas-pagar");
  revalidatePath("/pedidos");
  return { ok: true };
}

export interface PagoState { error?: string; ok?: boolean }

/** Cuentas de pago guardadas del proveedor (para "a dónde va"). */
export async function beneficiariosProveedorAction(proveedorId: number) {
  const c = await contexto();
  if (!c || !proveedorId) return [];
  return beneficiariosActivos(c.ctx.empresaId, proveedorId);
}

/** Registra cuánto le pagaste a un proveedor (se reparte FIFO a sus facturas). */
export async function pagarProveedorAction(proveedorId: number, _prev: PagoState, form: FormData): Promise<PagoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "pagos_proveedor.crear")) return { error: "No tienes permiso." };

  const monto = Number(form.get("monto"));
  if (!monto || monto <= 0) return { error: "Escribe cuánto le pagaste." };
  const metodoPago = String(form.get("metodoPago") || "efectivo");
  const fecha = String(form.get("fecha") || hoyColombia());
  const cuentaOrigenId = Number(form.get("cuentaOrigenId")) || undefined;
  if (!cuentaOrigenId) return { error: "Elige de qué cuenta sale el dinero." };

  const destino = String(form.get("destino") ?? "proveedor");
  let beneficiario = null;
  if (destino.startsWith("cuenta:")) {
    const bid = Number(destino.slice(7));
    const bens = JSON.parse(String(form.get("beneficiariosJson") ?? "[]")) as Array<{ id: number; banco: string; numeroCuenta: string; titularNit: string; titularNombre: string }>;
    const cuenta = bens.find((b) => b.id === bid);
    if (cuenta) beneficiario = resolverBeneficiario({ opcion: "guardada", cuenta });
  }

  try {
    await pagarAProveedor(proveedorId, { monto, metodoPago, fecha, cuentaOrigenId, beneficiario }, c.ctx);
  } catch (e) {
    if (e instanceof AbonoInvalido) return { error: e.message };
    console.error("[pagar] error:", e);
    return { error: "No se pudo registrar el pago." };
  }
  revalidatePath("/cuentas-pagar");
  revalidatePath("/pagos-proveedor");
  revalidatePath("/dashboard");
  return { ok: true };
}
