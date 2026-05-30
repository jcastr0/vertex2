import { describe, it, expect } from "vitest";
import { calcularSaldo, type MovimientoSaldo } from "./tesoreria";

const mov = (tipo: "entrada" | "salida", valor: number): MovimientoSaldo => ({ tipo, valor });

describe("calcularSaldo", () => {
  it("suma entradas y resta salidas al saldo inicial", () => {
    expect(calcularSaldo(100_000, [mov("entrada", 50_000), mov("salida", 30_000)])).toBe(120_000);
  });
  it("sin movimientos devuelve el saldo inicial", () => {
    expect(calcularSaldo(100_000, [])).toBe(100_000);
  });
  it("puede quedar negativo (sobregiro)", () => {
    expect(calcularSaldo(0, [mov("salida", 10_000)])).toBe(-10_000);
  });
});
