import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditoria, usuarios, nomenclatura } from "@/lib/db/schema";

export interface FilaAuditoria {
  id: number;
  fecha: Date;
  usuario: string | null;
  accion: string;
  tabla: string;
  modulo: string | null;
  modelId: number | null;
  ip: string | null;
}

/** Últimos N registros de auditoría de la empresa (más recientes primero).
 *  El nombre legible del módulo se resuelve desde vx00 (nomenclatura). */
export async function listarAuditoria(empresaId: number, limite = 500): Promise<FilaAuditoria[]> {
  return db
    .select({
      id: auditoria.id,
      fecha: auditoria.createdAt,
      usuario: usuarios.nombre,
      accion: auditoria.accion,
      tabla: auditoria.tablaAfectada,
      modulo: nomenclatura.descripcion,
      modelId: auditoria.modelId,
      ip: auditoria.ipOrigen,
    })
    .from(auditoria)
    .leftJoin(usuarios, eq(auditoria.usuarioId, usuarios.id))
    .leftJoin(nomenclatura, eq(nomenclatura.codigo, auditoria.tablaAfectada))
    .where(eq(auditoria.empresaId, empresaId))
    .orderBy(desc(auditoria.createdAt))
    .limit(limite);
}
