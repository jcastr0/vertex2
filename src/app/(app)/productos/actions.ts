"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseProductoForm, parseProductoUnidadForm } from "@/lib/validation/producto";
import {
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  agregarUnidadProducto,
  eliminarUnidadProducto,
  ConflictoProducto,
} from "@/lib/services/productos";

export interface ProductoState {
  error?: string;
}

export async function guardarProductoAction(
  _prev: ProductoState,
  form: FormData,
): Promise<ProductoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };

  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "productos.editar" : "productos.crear";
  if (!puede(c.permisos, permiso)) return { error: "No tienes permiso para esta acción." };

  const parsed = parseProductoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let destino: number | null = editando;
  try {
    if (editando) {
      await actualizarProducto(editando, parsed.data, c.ctx);
    } else {
      const creado = await crearProducto(parsed.data, c.ctx);
      destino = creado.id;
    }
  } catch (e) {
    if (e instanceof ConflictoProducto) return { error: e.message };
    console.error("[productos] error al guardar:", e);
    return { error: "Ocurrió un error al guardar el producto." };
  }

  revalidatePath("/productos");
  // Tras crear, ir a edición para gestionar presentaciones.
  redirect(editando ? "/productos" : `/productos/${destino}/editar`);
}

export async function cambiarEstadoProductoAction(id: number, activo: boolean): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.permisos, activo ? "productos.editar" : "productos.eliminar")) return;
  await cambiarEstadoProducto(id, activo, c.ctx);
  revalidatePath("/productos");
}

export async function agregarUnidadAction(
  _prev: ProductoState,
  form: FormData,
): Promise<ProductoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "productos.editar")) return { error: "Sin permiso." };

  const productoId = Number(form.get("productoId"));
  const parsed = parseProductoUnidadForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  try {
    await agregarUnidadProducto(productoId, parsed.data, c.ctx);
  } catch (e) {
    if (e instanceof ConflictoProducto) return { error: e.message };
    console.error("[productos] error al agregar unidad:", e);
    return { error: "No se pudo agregar la presentación." };
  }
  revalidatePath(`/productos/${productoId}/editar`);
  // Redirige a la misma página para refrescar la lista de presentaciones.
  redirect(`/productos/${productoId}/editar`);
}

export async function eliminarUnidadAction(
  productoUnidadId: number,
  productoId: number,
): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.permisos, "productos.editar")) return;
  await eliminarUnidadProducto(productoUnidadId, productoId, c.ctx);
  revalidatePath(`/productos/${productoId}/editar`);
}
