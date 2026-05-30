import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { productos, productoUnidades, unidadesMedida } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { ProductoInput, ProductoUnidadInput } from "@/lib/validation/producto";
import type { Contexto } from "./bodegas";

export type Producto = typeof productos.$inferSelect;
export type UnidadMedida = typeof unidadesMedida.$inferSelect;
export type ProductoUnidad = typeof productoUnidades.$inferSelect;

export class ConflictoProducto extends Error {}

function esViolacionUnica(e: unknown): boolean {
  return (
    typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505"
  );
}

// ── Catálogo global de unidades (vx09) ──────────────────────────────────────
export async function listarUnidadesMedida(): Promise<UnidadMedida[]> {
  return db.select().from(unidadesMedida).orderBy(unidadesMedida.nombre);
}

export interface ProductoVenta {
  id: number;
  nombre: string;
  sku: string;
  unidadBaseId: number;
  unidadAbrev: string;
  precio: number;
}

/** Productos activos con su unidad base y precio de venta base (para vender). */
export async function listarProductosVenta(empresaId: number): Promise<ProductoVenta[]> {
  const rows = await db
    .select({
      id: productos.id,
      nombre: productos.nombre,
      sku: productos.sku,
      unidadBaseId: productos.unidadBaseId,
      unidadAbrev: unidadesMedida.abreviatura,
      precioVenta: productoUnidades.precioVenta,
      ultimoPrecioVenta: productoUnidades.ultimoPrecioVenta,
    })
    .from(productos)
    .innerJoin(unidadesMedida, eq(productos.unidadBaseId, unidadesMedida.id))
    .leftJoin(
      productoUnidades,
      and(
        eq(productoUnidades.productoId, productos.id),
        eq(productoUnidades.unidadId, productos.unidadBaseId),
      ),
    )
    .where(and(eq(productos.empresaId, empresaId), eq(productos.activo, true)))
    .orderBy(productos.nombre);
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    sku: r.sku,
    unidadBaseId: r.unidadBaseId,
    unidadAbrev: r.unidadAbrev,
    precio: r.ultimoPrecioVenta ? Number(r.ultimoPrecioVenta) : (r.precioVenta ? Number(r.precioVenta) : 0),
  }));
}

// ── Productos (vx10) ─────────────────────────────────────────────────────────
function aColumnas(data: ProductoInput) {
  return {
    sku: data.sku,
    nombre: data.nombre,
    descripcion: data.descripcion || null,
    categoriaId: data.categoriaId,
    unidadBaseId: data.unidadBaseId,
    precioCompraSugerido:
      data.precioCompraSugerido != null ? String(data.precioCompraSugerido) : null,
    stockMinimo: String(data.stockMinimo),
    stockMaximo: data.stockMaximo != null ? String(data.stockMaximo) : null,
    clasificacionAbc: data.clasificacionAbc ? data.clasificacionAbc : null,
  };
}

export async function listarProductos(empresaId: number): Promise<Producto[]> {
  return db
    .select()
    .from(productos)
    .where(eq(productos.empresaId, empresaId))
    .orderBy(desc(productos.activo), productos.nombre);
}

export async function obtenerProducto(empresaId: number, id: number): Promise<Producto | null> {
  const [p] = await db
    .select()
    .from(productos)
    .where(and(eq(productos.empresaId, empresaId), eq(productos.id, id)))
    .limit(1);
  return p ?? null;
}

export async function crearProducto(data: ProductoInput, ctx: Contexto): Promise<Producto> {
  try {
    const [creado] = await db
      .insert(productos)
      .values({ empresaId: ctx.empresaId, ...aColumnas(data) })
      .returning();
    await registrarAuditoria({
      empresaId: ctx.empresaId,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx10",
      modelId: creado.id,
      accion: "CREAR",
      registroNuevo: creado,
      ipOrigen: ctx.ip,
    });
    return creado;
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoProducto("Ya existe un producto con ese SKU.");
    throw e;
  }
}

export async function actualizarProducto(
  id: number,
  data: ProductoInput,
  ctx: Contexto,
): Promise<Producto> {
  const anterior = await obtenerProducto(ctx.empresaId, id);
  if (!anterior) throw new Error("Producto no encontrado.");
  try {
    const [actualizado] = await db
      .update(productos)
      .set({ ...aColumnas(data), updatedAt: new Date() })
      .where(and(eq(productos.empresaId, ctx.empresaId), eq(productos.id, id)))
      .returning();
    await registrarAuditoria({
      empresaId: ctx.empresaId,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx10",
      modelId: id,
      accion: "ACTUALIZAR",
      registroAnterior: anterior,
      registroNuevo: actualizado,
      ipOrigen: ctx.ip,
    });
    return actualizado;
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoProducto("Ya existe un producto con ese SKU.");
    throw e;
  }
}

export async function cambiarEstadoProducto(
  id: number,
  activo: boolean,
  ctx: Contexto,
): Promise<void> {
  await db
    .update(productos)
    .set({ activo, updatedAt: new Date() })
    .where(and(eq(productos.empresaId, ctx.empresaId), eq(productos.id, id)));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx10",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activo },
    ipOrigen: ctx.ip,
  });
}

// ── Presentaciones / unidades del producto (vx11) ────────────────────────────
export type UnidadProductoRow = ProductoUnidad & { unidadNombre: string; unidadAbreviatura: string };

export async function listarUnidadesProducto(productoId: number): Promise<UnidadProductoRow[]> {
  const rows = await db
    .select({
      pu: productoUnidades,
      nombre: unidadesMedida.nombre,
      abreviatura: unidadesMedida.abreviatura,
    })
    .from(productoUnidades)
    .innerJoin(unidadesMedida, eq(productoUnidades.unidadId, unidadesMedida.id))
    .where(eq(productoUnidades.productoId, productoId));
  return rows.map((r) => ({ ...r.pu, unidadNombre: r.nombre, unidadAbreviatura: r.abreviatura }));
}

/** Verifica que el producto pertenezca a la empresa antes de mutar sus unidades. */
async function aseguraProductoDeEmpresa(empresaId: number, productoId: number): Promise<void> {
  const p = await obtenerProducto(empresaId, productoId);
  if (!p) throw new Error("Producto no encontrado en la empresa.");
}

export async function agregarUnidadProducto(
  productoId: number,
  data: ProductoUnidadInput,
  ctx: Contexto,
): Promise<void> {
  await aseguraProductoDeEmpresa(ctx.empresaId, productoId);
  try {
    const [creada] = await db
      .insert(productoUnidades)
      .values({
        productoId,
        unidadId: data.unidadId,
        factorConversion: String(data.factorConversion),
        precioVenta: data.precioVenta != null ? String(data.precioVenta) : null,
        esPrecioCalculado: data.esPrecioCalculado,
        permiteCompra: data.permiteCompra,
        permiteVenta: data.permiteVenta,
      })
      .returning();
    await registrarAuditoria({
      empresaId: ctx.empresaId,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx11",
      modelId: creada.id,
      accion: "CREAR",
      registroNuevo: creada,
      ipOrigen: ctx.ip,
    });
  } catch (e) {
    if (esViolacionUnica(e))
      throw new ConflictoProducto("Esa unidad ya está registrada para el producto.");
    throw e;
  }
}

export async function eliminarUnidadProducto(
  productoUnidadId: number,
  productoId: number,
  ctx: Contexto,
): Promise<void> {
  await aseguraProductoDeEmpresa(ctx.empresaId, productoId);
  await db
    .delete(productoUnidades)
    .where(and(eq(productoUnidades.id, productoUnidadId), eq(productoUnidades.productoId, productoId)));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx11",
    modelId: productoUnidadId,
    accion: "ELIMINAR",
    ipOrigen: ctx.ip,
  });
}
