"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseNotaInventarioForm } from "@/lib/validation/nota-inventario";
import { crearNotaInventario, NotaInvalida } from "@/lib/services/notas-inventario";
import { ultimoProveedorDeProducto } from "@/lib/services/pedidos";

export interface NotaState {
  error?: string;
}

export async function crearNotaAction(_prev: NotaState, form: FormData): Promise<NotaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "notas_inventario.crear")) return { error: "No tienes permiso." };

  const parsed = parseNotaInventarioForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    await crearNotaInventario(parsed.data, c.ctx);
  } catch (e) {
    if (e instanceof NotaInvalida) return { error: e.message };
    console.error("[notas-inventario] error:", e);
    return { error: "No se pudo registrar la nota." };
  }
  revalidatePath("/notas-inventario");
  revalidatePath("/inventario");
  redirect("/notas-inventario");
}

export async function proveedorSugeridoAction(productoId: number): Promise<number | null> {
  const c = await contexto();
  if (!c || !productoId) return null;
  return ultimoProveedorDeProducto(c.ctx.empresaId, productoId);
}
