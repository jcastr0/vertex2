/**
 * Conversión de unidades de medida de un producto.
 *
 * Convención: `factor` = cuántas unidades base equivale 1 unidad de la
 * presentación. Ej.: base = libra, presentación = bulto, factor = 125.
 * La unidad base tiene factor 1.
 */

/** Convierte una cantidad de la presentación a unidades base. */
export function cantidadEnBase(cantidad: number, factor: number): number {
  return cantidad * factor;
}

/** Precio (proporcional) de una presentación a partir del precio base. */
export function precioCalculado(precioBase: number, factor: number): number {
  return precioBase * factor;
}

/** Deriva el precio base a partir del precio de una presentación. */
export function precioBaseDesdeUnidad(precioUnidad: number, factor: number): number {
  if (factor === 0) {
    throw new Error("El factor de conversión no puede ser 0.");
  }
  return precioUnidad / factor;
}
