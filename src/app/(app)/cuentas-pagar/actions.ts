"use server";

import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseAbonoForm } from "@/lib/validation/abono";
import { registrarPago, AbonoInvalido } from "@/lib/services/cartera";
import { resolverBeneficiario } from "@/lib/domain/tesoreria";

export interface AbonoState {
  error?: string;
  ok?: boolean;
}

export async function registrarPagoAction(_prev: AbonoState, form: FormData): Promise<AbonoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "pagos_proveedor.crear")) return { error: "No tienes permiso." };

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
