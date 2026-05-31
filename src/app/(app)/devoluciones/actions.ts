"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseDevolucionForm } from "@/lib/validation/devolucion";
import { crearDevolucionCliente, DevolucionInvalida } from "@/lib/services/devoluciones";

export interface DevolucionState {
  error?: string;
}

export async function crearDevolucionAction(
  _prev: DevolucionState,
  form: FormData,
): Promise<DevolucionState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "devoluciones.crear")) return { error: "No tienes permiso." };

  const parsed = parseDevolucionForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let id: number;
  try {
    id = await crearDevolucionCliente(
      {
        clienteId: parsed.data.clienteId,
        bodegaId: parsed.data.bodegaId,
        facturaId: parsed.data.facturaId,
        fecha: parsed.data.fecha,
        motivo: parsed.data.motivo,
        lineas: parsed.data.lineas,
      },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof DevolucionInvalida) return { error: e.message };
    console.error("[devoluciones] error:", e);
    return { error: "No se pudo procesar la devolución." };
  }
  revalidatePath("/devoluciones");
  revalidatePath("/inventario");
  revalidatePath("/notas-credito");
  redirect(`/devoluciones?ok=${id}`);
}
