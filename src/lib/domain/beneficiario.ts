/**
 * Titular de una cuenta de pago de un proveedor (lógica pura, testeable).
 *
 * Caso común: la cuenta es del mismo proveedor → el titular es él (no se repite
 * NIT ni nombre). Caso especial: el dinero va a otra persona/empresa (factoring,
 * cesión) → se usan los datos capturados.
 */
export interface Titular {
  nit: string;
  nombre: string;
}

export function resolverTitular(
  esPropia: boolean,
  proveedor: Titular,
  manual: Partial<Titular>,
): Titular {
  if (esPropia) return { nit: proveedor.nit, nombre: proveedor.nombre };
  return { nit: (manual.nit ?? "").trim(), nombre: (manual.nombre ?? "").trim() };
}
