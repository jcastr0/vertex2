"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth/cookies";
import { puede } from "@/lib/auth/roles";
import { parseFacturaForm } from "@/lib/validation/factura";
import { crearFactura, VentaInvalida } from "@/lib/services/facturas";
import type { Contexto } from "@/lib/services/bodegas";

export interface FacturaState {
  error?: string;
}

async function contexto(): Promise<{ ctx: Contexto; rol: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion || sesion.empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { rol: sesion.rol, ctx: { empresaId: sesion.empresaId, usuarioId: sesion.uid, ip } };
}

export async function crearFacturaAction(
  _prev: FacturaState,
  form: FormData,
): Promise<FacturaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "facturas.crear")) return { error: "No tienes permiso para vender." };

  const parsed = parseFacturaForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let nuevoId: number;
  try {
    const f = await crearFactura(
      {
        clienteId: parsed.data.clienteId,
        bodegaId: parsed.data.bodegaId,
        fecha: parsed.data.fecha,
        tipoVenta: parsed.data.tipoVenta,
        lineas: parsed.data.lineas,
      },
      c.ctx,
    );
    nuevoId = f.id;
  } catch (e) {
    if (e instanceof VentaInvalida) return { error: e.message };
    console.error("[facturas] error al crear:", e);
    return { error: "Ocurrió un error al registrar la venta." };
  }
  revalidatePath("/facturas");
  revalidatePath("/inventario");
  redirect(`/facturas/${nuevoId}`);
}
