import "server-only";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bancos } from "@/lib/db/schema";
import type { OpcionSelect } from "@/components/ui/search-select";

const ETIQUETA_TIPO: Record<string, string> = {
  billetera: "billetera",
  cooperativa: "cooperativa",
  financiera: "financiera",
};

/**
 * Opciones para el selector de banco. El `value` es el nombre canónico — es lo
 * que se guarda en la cuenta (columnas `banco`), evitando typos. El `hint`
 * marca billeteras/cooperativas para distinguirlas de los bancos.
 */
export async function listarBancos(): Promise<OpcionSelect[]> {
  const filas = await db
    .select({ nombre: bancos.nombre, tipo: bancos.tipo })
    .from(bancos)
    .where(eq(bancos.activo, true))
    .orderBy(asc(bancos.orden), asc(bancos.nombre));

  return filas.map((b) => ({
    value: b.nombre,
    label: b.nombre,
    hint: b.tipo ? ETIQUETA_TIPO[b.tipo] : undefined,
  }));
}
