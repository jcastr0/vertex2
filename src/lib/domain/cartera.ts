/**
 * Lógica de cartera (pura, testeable). Aplicar un abono/pago/recaudo o nota
 * crédito a un saldo pendiente.
 */
export interface ResultadoAbono {
  nuevoSaldo: number;
  aplicado: number;
  excedente: number;
}

export function aplicarAbono(saldoPendiente: number, monto: number): ResultadoAbono {
  if (monto <= 0) {
    throw new Error("El monto debe ser mayor a 0.");
  }
  const aplicado = Math.min(saldoPendiente, monto);
  return {
    nuevoSaldo: saldoPendiente - aplicado,
    aplicado,
    excedente: monto - aplicado,
  };
}

export type EstadoCartera = "pagada" | "vencida" | "pendiente";

/** Estado de una cuenta según saldo y vencimiento (comparación de fechas ISO yyyy-mm-dd). */
export function estadoCartera(
  saldoPendiente: number,
  fechaVencimientoISO: string,
  hoyISO: string,
): EstadoCartera {
  if (saldoPendiente <= 0) return "pagada";
  return fechaVencimientoISO < hoyISO ? "vencida" : "pendiente";
}

export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta_debito", label: "Tarjeta débito" },
  { value: "tarjeta_credito", label: "Tarjeta crédito" },
] as const;
