import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuarios, usuariosEmpresas, roles } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import type { UsuarioInput } from "@/lib/validation/usuario";
import type { Contexto } from "./bodegas";

export class ConflictoUsuario extends Error {}

function esViolacionUnica(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

export interface FilaUsuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  esSuperadmin: boolean;
  esRecaudador: boolean;
  rol: string | null;
  rolId: number | null;
}

/** Usuarios vinculados a la empresa (vía vx05), con su rol. */
export async function listarUsuarios(empresaId: number): Promise<FilaUsuario[]> {
  const rows = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      activo: usuarios.activo,
      esSuperadmin: usuarios.esSuperadmin,
      esRecaudador: usuarios.esRecaudador,
      rol: roles.nombre,
      rolId: usuariosEmpresas.rolId,
    })
    .from(usuariosEmpresas)
    .innerJoin(usuarios, eq(usuariosEmpresas.usuarioId, usuarios.id))
    .leftJoin(roles, eq(usuariosEmpresas.rolId, roles.id))
    .where(eq(usuariosEmpresas.empresaId, empresaId))
    .orderBy(desc(usuarios.activo), usuarios.nombre);
  return rows;
}

export async function obtenerUsuario(empresaId: number, id: number): Promise<FilaUsuario | null> {
  const [u] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      activo: usuarios.activo,
      esSuperadmin: usuarios.esSuperadmin,
      esRecaudador: usuarios.esRecaudador,
      rol: roles.nombre,
      rolId: usuariosEmpresas.rolId,
    })
    .from(usuariosEmpresas)
    .innerJoin(usuarios, eq(usuariosEmpresas.usuarioId, usuarios.id))
    .leftJoin(roles, eq(usuariosEmpresas.rolId, roles.id))
    .where(and(eq(usuariosEmpresas.empresaId, empresaId), eq(usuariosEmpresas.usuarioId, id)))
    .limit(1);
  return u ?? null;
}

export async function listarRolesAsignables() {
  // Excluye SuperAdmin: no se asigna desde este módulo.
  return (await db.select().from(roles).orderBy(roles.nombre)).filter((r) => r.nombre !== "SuperAdmin");
}

/** Usuarios recaudadores activos de la empresa (para asignar a clientes). */
export async function listarRecaudadores(empresaId: number): Promise<{ id: number; nombre: string }[]> {
  return db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuariosEmpresas)
    .innerJoin(usuarios, eq(usuariosEmpresas.usuarioId, usuarios.id))
    .where(
      and(
        eq(usuariosEmpresas.empresaId, empresaId),
        eq(usuarios.esRecaudador, true),
        eq(usuarios.activo, true),
      ),
    )
    .orderBy(usuarios.nombre);
}

export async function crearUsuario(data: UsuarioInput, ctx: Contexto): Promise<void> {
  if (!data.password) throw new ConflictoUsuario("La contraseña es obligatoria al crear.");
  const hash = await hashPassword(data.password);
  try {
    await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(usuarios)
        .values({
          empresaId: ctx.empresaId,
          nombre: data.nombre,
          email: data.email.toLowerCase().trim(),
          password: hash,
          activo: data.activo,
          esRecaudador: data.esRecaudador,
        })
        .returning();
      await tx.insert(usuariosEmpresas).values({
        usuarioId: u.id,
        empresaId: ctx.empresaId,
        rolId: data.rolId,
      });
      await registrarAuditoria(
        {
          empresaId: ctx.empresaId,
          usuarioId: ctx.usuarioId,
          tablaAfectada: "vx02_usuarios",
          modelId: u.id,
          accion: "CREAR",
          registroNuevo: { nombre: u.nombre, email: u.email },
          ipOrigen: ctx.ip,
        },
        tx,
      );
    });
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoUsuario("Ya existe un usuario con ese correo.");
    throw e;
  }
}

export async function actualizarUsuario(id: number, data: UsuarioInput, ctx: Contexto): Promise<void> {
  await db.transaction(async (tx) => {
    const set: Record<string, unknown> = {
      nombre: data.nombre,
      email: data.email.toLowerCase().trim(),
      activo: data.activo,
      esRecaudador: data.esRecaudador,
      updatedAt: new Date(),
    };
    if (data.password) set.password = await hashPassword(data.password);
    await tx.update(usuarios).set(set).where(eq(usuarios.id, id));
    await tx
      .update(usuariosEmpresas)
      .set({ rolId: data.rolId })
      .where(and(eq(usuariosEmpresas.usuarioId, id), eq(usuariosEmpresas.empresaId, ctx.empresaId)));
    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx02_usuarios",
        modelId: id,
        accion: "ACTUALIZAR",
        registroNuevo: { nombre: data.nombre, rolId: data.rolId, activo: data.activo },
        ipOrigen: ctx.ip,
      },
      tx,
    );
  });
}

export async function cambiarEstadoUsuario(id: number, activo: boolean, ctx: Contexto): Promise<void> {
  await db.update(usuarios).set({ activo, updatedAt: new Date() }).where(eq(usuarios.id, id));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx02_usuarios",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activo },
    ipOrigen: ctx.ip,
  });
}
