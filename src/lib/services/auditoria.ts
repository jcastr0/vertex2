import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditoria, usuarios } from "@/lib/db/schema";

export interface FilaAuditoria {
  id: number;
  fecha: Date;
  usuario: string | null;
  accion: string;
  tabla: string;
  modelId: number | null;
  ip: string | null;
}

/** Últimos N registros de auditoría de la empresa (más recientes primero). */
export async function listarAuditoria(empresaId: number, limite = 500): Promise<FilaAuditoria[]> {
  return db
    .select({
      id: auditoria.id,
      fecha: auditoria.createdAt,
      usuario: usuarios.nombre,
      accion: auditoria.accion,
      tabla: auditoria.tablaAfectada,
      modelId: auditoria.modelId,
      ip: auditoria.ipOrigen,
    })
    .from(auditoria)
    .leftJoin(usuarios, eq(auditoria.usuarioId, usuarios.id))
    .where(eq(auditoria.empresaId, empresaId))
    .orderBy(desc(auditoria.createdAt))
    .limit(limite);
}
