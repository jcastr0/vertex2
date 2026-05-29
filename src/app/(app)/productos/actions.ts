"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth/cookies";
import { puede, type Permiso } from "@/lib/auth/roles";
import { parseProductoForm, parseProductoUnidadForm } from "@/lib/validation/producto";
import {
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  agregarUnidadProducto,
  eliminarUnidadProducto,
  ConflictoProducto,
} from "@/lib/services/productos";
import type { Contexto } from "@/lib/services/bodegas";

export interface ProductoState {
  error?: string;
}

async function contexto(): Promise<{ ctx: Contexto; rol: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion || sesion.empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { rol: sesion.rol, ctx: { empresaId: sesion.empresaId, usuarioId: sesion.uid, ip } };
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
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso para esta acción." };

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
  if (!puede(c.rol, activo ? "productos.editar" : "productos.eliminar")) return;
  await cambiarEstadoProducto(id, activo, c.ctx);
  revalidatePath("/productos");
}

export async function agregarUnidadAction(
  _prev: ProductoState,
  form: FormData,
): Promise<ProductoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "productos.editar")) return { error: "Sin permiso." };

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
  if (!puede(c.rol, "productos.editar")) return;
  await eliminarUnidadProducto(productoUnidadId, productoId, c.ctx);
  revalidatePath(`/productos/${productoId}/editar`);
}
