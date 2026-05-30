/**
 * Reparto de un abono entre las deudas de un cliente (lógica pura, testeable).
 * Se aplica a la deuda más antigua primero (FIFO); no sobrepasa cada saldo ni
 * el total adeudado.
 */
export interface Deuda {
  id: number;
  saldo: number;
}

export interface Aplicacion {
  id: number;
  abono: number;
}

/**
 * @param deudas deudas abiertas del cliente, YA ordenadas (más antigua primero)
 * @param monto  cuánto pagó el cliente
 * @returns aplicaciones por deuda (solo las que reciben > 0)
 */
export function distribuirFIFO(deudas: Deuda[], monto: number): Aplicacion[] {
  let restante = Math.max(0, monto);
  const out: Aplicacion[] = [];
  for (const d of deudas) {
    if (restante <= 0) break;
    const abono = Math.min(d.saldo, restante);
    if (abono > 0) {
      out.push({ id: d.id, abono });
      restante -= abono;
    }
  }
  return out;
}

/** Total adeudado (suma de saldos). */
export function totalAdeudado(deudas: Deuda[]): number {
  return deudas.reduce((a, d) => a + d.saldo, 0);
}
