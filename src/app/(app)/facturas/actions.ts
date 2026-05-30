"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseFacturaForm } from "@/lib/validation/factura";
import { crearFactura, ultimoPrecioPorCliente, VentaInvalida } from "@/lib/services/facturas";

export interface FacturaState {
  error?: string;
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

export async function preciosClienteAction(clienteId: number): Promise<Record<number, number>> {
  const c = await contexto();
  if (!c || !clienteId) return {};
  return ultimoPrecioPorCliente(c.ctx.empresaId, clienteId);
}
