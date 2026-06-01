/**
 * Origen de un movimiento de inventario: el documento que lo generó, para poder
 * navegar a él (descubrimiento en profundidad del kardex). Devuelve null para
 * movimientos sin documento (ajustes manuales, saldo inicial, re-entradas de anulación).
 */
export interface MovimientoConOrigen {
  facturaId?: number | null;
  pedidoId?: number | null;
  trasladoId?: number | null;
  referencia?: string | null;
}

export function origenDocumento(m: MovimientoConOrigen): { href: string; label: string } | null {
  const ref = m.referencia?.trim() || "";
  if (m.facturaId) return { href: `/facturas/${m.facturaId}`, label: ref || "Factura" };
  if (m.pedidoId) return { href: `/pedidos/${m.pedidoId}`, label: ref || "Pedido" };
  if (m.trasladoId) return { href: `/traslados/${m.trasladoId}`, label: ref || "Traslado" };
  return null;
}
