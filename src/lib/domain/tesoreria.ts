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

export function movimientoDesdePago(pago: { valor: number; retencionTotal: number }): MovimientoSaldo {
  return { tipo: "salida", valor: pago.valor - pago.retencionTotal };
}

export interface BeneficiarioSnapshot {
  beneficiarioCuentaId: number | null;
  banco: string;
  numeroCuenta: string;
  nit: string;
  nombre: string;
}

interface CuentaGuardada {
  id: number;
  banco: string;
  numeroCuenta: string;
  titularNit: string;
  titularNombre: string;
}
interface DatosAdhoc {
  banco: string;
  numeroCuenta: string;
  nit: string;
  nombre: string;
}
type OpcionBeneficiario =
  | { opcion: "proveedor" }
  | { opcion: "guardada"; cuenta: CuentaGuardada }
  | { opcion: "adhoc"; adhoc: DatosAdhoc };

export function resolverBeneficiario(sel: OpcionBeneficiario): BeneficiarioSnapshot | null {
  if (sel.opcion === "proveedor") return null;
  if (sel.opcion === "guardada") {
    return {
      beneficiarioCuentaId: sel.cuenta.id,
      banco: sel.cuenta.banco,
      numeroCuenta: sel.cuenta.numeroCuenta,
      nit: sel.cuenta.titularNit,
      nombre: sel.cuenta.titularNombre,
    };
  }
  return { beneficiarioCuentaId: null, ...sel.adhoc };
}
