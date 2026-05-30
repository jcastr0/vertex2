/**
 * Tesorería: cálculo de saldos y movimientos (lógica pura, testeable).
 * El saldo de una cuenta = saldo inicial + Σ entradas − Σ salidas.
 */
export interface MovimientoSaldo {
  tipo: "entrada" | "salida";
  valor: number;
}

export function calcularSaldo(saldoInicial: number, movimientos: MovimientoSaldo[]): number {
  return movimientos.reduce(
    (acc, m) => (m.tipo === "entrada" ? acc + m.valor : acc - m.valor),
    saldoInicial,
  );
}

export function saldoCorrido<T extends MovimientoSaldo>(
  saldoInicial: number,
  movimientos: T[],
): Array<T & { saldo: number }> {
  let saldo = saldoInicial;
  return movimientos.map((m) => {
    saldo = m.tipo === "entrada" ? saldo + m.valor : saldo - m.valor;
    return { ...m, saldo };
  });
}
