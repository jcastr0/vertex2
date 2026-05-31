import "server-only";

/** Resumen de inventario de una bodega a partir de las existencias de sus productos. Puro. */
export function resumenInventarioBodega(
  filas: { existencia: number; valor: number }[],
): { productosDistintos: number; sinExistencia: number; valorInventario: number } {
  let productosDistintos = 0;
  let sinExistencia = 0;
  let valorInventario = 0;
  for (const f of filas) {
    if (f.existencia > 0) productosDistintos++;
    else sinExistencia++;
    valorInventario += f.valor;
  }
  return { productosDistintos, sinExistencia, valorInventario };
}
