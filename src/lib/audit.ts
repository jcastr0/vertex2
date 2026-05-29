import "server-only";
import { db } from "@/lib/db";
import { auditoria } from "@/lib/db/schema";

/**
 * Ejecutor de escritura: el `db` global o una transacción (`tx`). Cuando la
 * auditoría ocurre dentro de una transacción DEBE recibir el `tx`, de lo
 * contrario intentaría tomar otra conexión y, con pool pequeño, se bloquea.
 */
type Ejecutor = Pick<typeof db, "insert">;

export type AccionAuditoria = "CREAR" | "ACTUALIZAR" | "ELIMINAR";

export interface EntradaAuditoria {
  empresaId: number | null;
  usuarioId: number | null;
  tablaAfectada: string;
  modelId?: number | null;
  modelType?: string | null;
  accion: AccionAuditoria;
  registroAnterior?: unknown;
  registroNuevo?: unknown;
  ipOrigen?: string | null;
}

/**
 * Registra una entrada de auditoría (vx03). Pensado para invocarse tras cada
 * operación CRUD relevante. Nunca lanza: la auditoría no debe tumbar la
 * operación de negocio.
 */
export async function registrarAuditoria(
  entrada: EntradaAuditoria,
  ejecutor: Ejecutor = db,
): Promise<void> {
  try {
    await ejecutor.insert(auditoria).values({
      empresaId: entrada.empresaId,
      usuarioId: entrada.usuarioId,
      tablaAfectada: entrada.tablaAfectada,
      modelId: entrada.modelId ?? null,
      modelType: entrada.modelType ?? null,
      accion: entrada.accion,
      registroAnterior: entrada.registroAnterior ?? null,
      registroNuevo: entrada.registroNuevo ?? null,
      ipOrigen: entrada.ipOrigen ?? null,
    });
  } catch (e) {
    console.error("[auditoria] no se pudo registrar:", e);
  }
}
