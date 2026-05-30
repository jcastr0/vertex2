/** Búsqueda y carrito de la venta (lógica pura, testeable). */
export interface ProductoBuscable {
  id: number;
  nombre: string;
  sku: string;
}

export function buscarProductos<T extends ProductoBuscable>(items: T[], q: string, limite: number): T[] {
  const t = q.trim().toLowerCase();
  if (!t) return items.slice(0, limite);
  const conRango = items
    .map((p) => {
      const nombre = p.nombre.toLowerCase();
      const sku = p.sku.toLowerCase();
      let rango = -1;
      if (nombre.startsWith(t) || sku.startsWith(t)) rango = 0;
      else if (nombre.includes(t) || sku.includes(t)) rango = 1;
      return { p, rango };
    })
    .filter((x) => x.rango >= 0)
    .sort((a, b) => a.rango - b.rango);
  return conRango.slice(0, limite).map((x) => x.p);
}

export interface LineaCarrito {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

export function agregarOIncrementar(carrito: LineaCarrito[], productoId: number, precioSugerido: number): LineaCarrito[] {
  const existe = carrito.some((l) => l.productoId === productoId);
  if (existe) {
    return carrito.map((l) => (l.productoId === productoId ? { ...l, cantidad: l.cantidad + 1 } : l));
  }
  return [...carrito, { productoId, cantidad: 1, precioUnitario: precioSugerido }];
}

export function precioSugerido(
  productoId: number,
  fuentes: { porCliente: Record<number, number>; base: Record<number, number> },
): number {
  return fuentes.porCliente[productoId] ?? fuentes.base[productoId] ?? 0;
}

/** Unidad sugerida al vender: la última usada para ese producto, o la base. */
export function sugerirUnidadVenta(
  productoId: number,
  ultimaUnidadPorProducto: Record<number, number>,
  unidadBaseId: number,
): number {
  return ultimaUnidadPorProducto[productoId] ?? unidadBaseId;
}
