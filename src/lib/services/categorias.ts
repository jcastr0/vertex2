import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categoriasProductos } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { CategoriaInput } from "@/lib/validation/categoria";
import type { Contexto } from "./bodegas";

export type Categoria = typeof categoriasProductos.$inferSelect;

export async function listarCategorias(empresaId: number): Promise<Categoria[]> {
  return db
    .select()
    .from(categoriasProductos)
    .where(eq(categoriasProductos.empresaId, empresaId))
    .orderBy(desc(categoriasProductos.activo), categoriasProductos.nombre);
}

export async function obtenerCategoria(empresaId: number, id: number): Promise<Categoria | null> {
  const [c] = await db
    .select()
    .from(categoriasProductos)
    .where(and(eq(categoriasProductos.empresaId, empresaId), eq(categoriasProductos.id, id)))
    .limit(1);
  return c ?? null;
}

export async function crearCategoria(data: CategoriaInput, ctx: Contexto): Promise<Categoria> {
  const [creada] = await db
    .insert(categoriasProductos)
    .values({
      empresaId: ctx.empresaId,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      padreId: data.padreId,
    })
    .returning();
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx08_categorias_productos",
    modelId: creada.id,
    accion: "CREAR",
    registroNuevo: creada,
    ipOrigen: ctx.ip,
  });
  return creada;
}

export async function actualizarCategoria(
  id: number,
  data: CategoriaInput,
  ctx: Contexto,
): Promise<Categoria> {
  const anterior = await obtenerCategoria(ctx.empresaId, id);
  if (!anterior) throw new Error("Categoría no encontrada.");
  // Evita ciclo trivial: una categoría no puede ser su propia padre.
  const padreId = data.padreId === id ? null : data.padreId;
  const [actualizada] = await db
    .update(categoriasProductos)
    .set({
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      padreId,
      updatedAt: new Date(),
    })
    .where(and(eq(categoriasProductos.empresaId, ctx.empresaId), eq(categoriasProductos.id, id)))
    .returning();
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx08_categorias_productos",
    modelId: id,
    accion: "ACTUALIZAR",
    registroAnterior: anterior,
    registroNuevo: actualizada,
    ipOrigen: ctx.ip,
  });
  return actualizada;
}

export async function cambiarEstadoCategoria(
  id: number,
  activo: boolean,
  ctx: Contexto,
): Promise<void> {
  await db
    .update(categoriasProductos)
    .set({ activo, updatedAt: new Date() })
    .where(and(eq(categoriasProductos.empresaId, ctx.empresaId), eq(categoriasProductos.id, id)));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx08_categorias_productos",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activo },
    ipOrigen: ctx.ip,
  });
}
