"use server";

import { requireEmpresa } from "@/lib/auth/guard";
import { buscarGlobal, type ResultadoBusqueda } from "@/lib/services/busqueda";

/**
 * Búsqueda global bajo demanda. Resuelve la empresa activa de la sesión en cada
 * llamada (requireEmpresa), así siempre busca en la empresa actual y nunca mezcla.
 */
export async function buscarGlobalAction(query: string): Promise<ResultadoBusqueda[]> {
  const { empresaId } = await requireEmpresa();
  return buscarGlobal(empresaId, query);
}
