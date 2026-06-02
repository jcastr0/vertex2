/** Lógica pura de cotizaciones (pedidos de cliente). Con prueba de escritorio. */

export interface LineaCotizacion {
  cantidad: number;
  precioUnitario: number;
}

/** Total = suma de cantidad × precio de cada línea. */
export function totalCotizacion(lineas: LineaCotizacion[]): number {
  return lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);
}

/** Solo una cotización pendiente puede facturarse o anularse. */
export function puedeFacturar(estado: string): boolean {
  return estado === "pendiente";
}
export function puedeAnular(estado: string): boolean {
  return estado === "pendiente";
}
