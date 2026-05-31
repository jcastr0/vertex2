import "server-only";
import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, usuariosEmpresas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { permisosValidos } from "@/lib/validation/rol";
import type { Contexto } from "./bodegas";

export class RolInvalido extends Error {}
export type Rol = typeof roles.$inferSelect;

export async function listarRoles(): Promise<(Rol & { usuarios: number })[]> {
  const rows = await db
    .select({ rol: roles, usuarios: sql<number>`count(${usuariosEmpresas.id})` })
    .from(roles)
    .leftJoin(usuariosEmpresas, eq(usuariosEmpresas.rolId, roles.id))
    .groupBy(roles.id)
    .orderBy(asc(roles.nombre));
  return rows.map((r) => ({ ...r.rol, usuarios: Number(r.usuarios) }));
}

export async function obtenerRol(id: number): Promise<Rol | null> {
  const [r] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return r ?? null;
}

export async function crearRol(
  nombre: string,
  permisos: string[],
  ctx: Contexto,
): Promise<number> {
  if (!permisosValidos(permisos)) throw new RolInvalido("Hay permisos inválidos.");
  let creado: Rol;
  try {
    [creado] = await db
      .insert(roles)
      .values({ nombre, descripcion: `Rol ${nombre}`, permisos })
      .returning();
  } catch (e) {
    // 23505 = unique_violation (nombre de rol duplicado)
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505") {
      throw new RolInvalido("Ya existe un rol con ese nombre.");
    }
    throw e;
  }
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx01",
    modelId: creado.id,
    accion: "CREAR",
    registroNuevo: { nombre },
    ipOrigen: ctx.ip,
  });
  return creado.id;
}

export async function guardarPermisosRol(
  id: number,
  permisos: string[],
  ctx: Contexto,
): Promise<void> {
  const rol = await obtenerRol(id);
  if (!rol) throw new RolInvalido("Rol no encontrado.");
  if (rol.nombre === "SuperAdmin") throw new RolInvalido("SuperAdmin no es editable.");
  if (!permisosValidos(permisos)) throw new RolInvalido("Hay permisos inválidos.");
  await db.update(roles).set({ permisos, updatedAt: new Date() }).where(eq(roles.id, id));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx01",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { permisos: permisos.length },
    ipOrigen: ctx.ip,
  });
}
