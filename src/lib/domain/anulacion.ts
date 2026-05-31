export function puedeAnular(
  estado: string,
  saldoPendiente: number,
  total: number,
  tipoVenta: string,
): { ok: boolean; motivo?: string } {
  if (estado !== "emitida") return { ok: false, motivo: "Solo se pueden anular facturas emitidas." };
  if (tipoVenta === "credito" && saldoPendiente < total) {
    return { ok: false, motivo: "La factura tiene cobros aplicados; revierte los recaudos primero." };
  }
  return { ok: true };
}

/** Diferencia de arqueo = lo contado menos lo esperado (negativo = faltante). */
export function diferenciaArqueo(esperado: number, contado: number): number {
  return contado - esperado;
}
