import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasBeneficiario } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { BeneficiarioInput } from "@/lib/validation/beneficiario";
import type { Contexto } from "./bodegas";

export type Beneficiario = typeof cuentasBeneficiario.$inferSelect;

export async function listarBeneficiarios(empresaId: number, terceroId: number): Promise<Beneficiario[]> {
  return db
    .select()
    .from(cuentasBeneficiario)
    .where(and(eq(cuentasBeneficiario.empresaId, empresaId), eq(cuentasBeneficiario.terceroId, terceroId)))
    .orderBy(desc(cuentasBeneficiario.activa), cuentasBeneficiario.titularNombre);
}

/** Solo activas, para el select del modal de pago. */
export async function beneficiariosActivos(empresaId: number, terceroId: number): Promise<Beneficiario[]> {
  return db
    .select()
    .from(cuentasBeneficiario)
    .where(and(eq(cuentasBeneficiario.empresaId, empresaId), eq(cuentasBeneficiario.terceroId, terceroId), eq(cuentasBeneficiario.activa, true)))
    .orderBy(cuentasBeneficiario.titularNombre);
}

export async function crearBeneficiario(terceroId: number, data: BeneficiarioInput, ctx: Contexto): Promise<Beneficiario> {
  const [b] = await db
    .insert(cuentasBeneficiario)
    .values({ empresaId: ctx.empresaId, terceroId, banco: data.banco, tipo: data.tipo, numeroCuenta: data.numeroCuenta, titularNit: data.titularNit, titularNombre: data.titularNombre, activa: data.activa })
    .returning();
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx34", modelId: b.id, accion: "CREAR", registroNuevo: b, ipOrigen: ctx.ip });
  return b;
}

export async function cambiarEstadoBeneficiario(id: number, activa: boolean, ctx: Contexto): Promise<void> {
  await db
    .update(cuentasBeneficiario)
    .set({ activa, updatedAt: new Date() })
    .where(and(eq(cuentasBeneficiario.empresaId, ctx.empresaId), eq(cuentasBeneficiario.id, id)));
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx34", modelId: id, accion: "ACTUALIZAR", registroNuevo: { activa }, ipOrigen: ctx.ip });
}
