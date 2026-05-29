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
