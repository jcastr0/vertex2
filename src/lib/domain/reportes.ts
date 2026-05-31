// src/lib/domain/reportes.ts
/** Tramo de antigüedad de cartera según días vencido. */
export function tramoAging(diasVencido: number): "Corriente" | "1-30" | "31-60" | "61-90" | "+90" {
  if (diasVencido <= 0) return "Corriente";
  if (diasVencido <= 30) return "1-30";
  if (diasVencido <= 60) return "31-60";
  if (diasVencido <= 90) return "61-90";
  return "+90";
}

/** Margen porcentual sobre el precio de venta. */
export function margenPorc(precio: number, costo: number): number {
  if (precio <= 0) return 0;
  return ((precio - costo) / precio) * 100;
}

/** Ticket promedio = total / número de facturas. */
export function ticketPromedio(total: number, nFacturas: number): number {
  return nFacturas > 0 ? total / nFacturas : 0;
}

/** % de visitas que terminaron en pago o abono. */
export function efectividadVisitas(conPago: number, totalVisitas: number): number {
  return totalVisitas > 0 ? (conPago / totalVisitas) * 100 : 0;
}
