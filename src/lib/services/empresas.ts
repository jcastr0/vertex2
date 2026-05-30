import "server-only";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { EmpresaInput } from "@/lib/validation/empresa";

export type Empresa = typeof empresas.$inferSelect;
export class ConflictoEmpresa extends Error {}

function esViolacionUnica(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

interface CtxSistema {
  usuarioId: number;
  ip?: string | null;
}

export async function listarEmpresas(): Promise<Empresa[]> {
  return db.select().from(empresas).orderBy(desc(empresas.activa), asc(empresas.nombre));
}

export async function obtenerEmpresa(id: number): Promise<Empresa | null> {
  const [e] = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
  return e ?? null;
}

function aColumnas(data: EmpresaInput) {
  return {
    nombre: data.nombre,
    razonSocial: data.razonSocial,
    nit: data.nit,
    email: data.email,
    telefono: data.telefono || null,
    direccion: data.direccion || null,
    ciudad: data.ciudad || null,
    pais: data.pais || "Colombia",
  };
}

export async function crearEmpresa(data: EmpresaInput, ctx: CtxSistema): Promise<Empresa> {
  try {
    const [creada] = await db.insert(empresas).values(aColumnas(data)).returning();
    await registrarAuditoria({
      empresaId: creada.id,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx04",
      modelId: creada.id,
      accion: "CREAR",
      registroNuevo: creada,
      ipOrigen: ctx.ip,
    });
    return creada;
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoEmpresa("Ya existe una empresa con ese nombre.");
    throw e;
  }
}

export async function actualizarEmpresa(id: number, data: EmpresaInput, ctx: CtxSistema): Promise<Empresa> {
  const anterior = await obtenerEmpresa(id);
  if (!anterior) throw new Error("Empresa no encontrada.");
  try {
    const [act] = await db
      .update(empresas)
      .set({ ...aColumnas(data), updatedAt: new Date() })
      .where(eq(empresas.id, id))
      .returning();
    await registrarAuditoria({
      empresaId: id,
      usuarioId: ctx.usuarioId,
      tablaAfectada: "vx04",
      modelId: id,
      accion: "ACTUALIZAR",
      registroAnterior: anterior,
      registroNuevo: act,
      ipOrigen: ctx.ip,
    });
    return act;
  } catch (e) {
    if (esViolacionUnica(e)) throw new ConflictoEmpresa("Ya existe una empresa con ese nombre.");
    throw e;
  }
}

export async function cambiarEstadoEmpresa(id: number, activa: boolean, ctx: CtxSistema): Promise<void> {
  await db.update(empresas).set({ activa, updatedAt: new Date() }).where(eq(empresas.id, id));
  await registrarAuditoria({
    empresaId: id,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx04",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activa },
    ipOrigen: ctx.ip,
  });
}
