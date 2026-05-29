/**
 * Costeo de inventario para Vertex.
 *  - Prorrateo de costos adicionales del pedido (flete, etc.) entre líneas.
 *  - Costo promedio ponderado al recibir mercancía.
 * Funciones puras con pruebas de escritorio.
 */

/** Reparte `costoAdicionalTotal` entre líneas, proporcional a su subtotal. */
export function prorratearCostos(subtotales: number[], costoAdicionalTotal: number): number[] {
  const suma = subtotales.reduce((a, b) => a + b, 0);
  if (suma === 0 || costoAdicionalTotal === 0) {
    return subtotales.map(() => 0);
  }
  return subtotales.map((s) => (costoAdicionalTotal * s) / suma);
}

export interface ResultadoCosteo {
  cantidad: number;
  costoPromedio: number;
}

/** Nuevo costo promedio ponderado tras una entrada de stock. */
export function costoPromedioPonderado(
  cantidadActual: number,
  costoActual: number,
  cantidadEntrante: number,
  costoEntrante: number,
): ResultadoCosteo {
  const cantidad = cantidadActual + cantidadEntrante;
  if (cantidad <= 0) return { cantidad: 0, costoPromedio: 0 };
  const costoPromedio =
    (cantidadActual * costoActual + cantidadEntrante * costoEntrante) / cantidad;
  return { cantidad, costoPromedio };
}

/** Costo unitario por unidad base a partir del costo total de una línea. */
export function costoUnitarioBase(costoTotalLinea: number, cantidadBase: number): number {
  if (cantidadBase === 0) {
    throw new Error("La cantidad base no puede ser 0.");
  }
  return costoTotalLinea / cantidadBase;
}
