import { describe, it, expect } from "vitest";
import { calcularSaldo, saldoCorrido, movimientoDesdePago, type MovimientoSaldo } from "./tesoreria";

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

describe("saldoCorrido", () => {
  it("acumula el saldo movimiento a movimiento", () => {
    const movs = [
      { tipo: "entrada" as const, valor: 100 },
      { tipo: "salida" as const, valor: 40 },
      { tipo: "entrada" as const, valor: 10 },
    ];
    const r = saldoCorrido(0, movs);
    expect(r.map((m) => m.saldo)).toEqual([100, 60, 70]);
  });
  it("arranca desde el saldo inicial", () => {
    const r = saldoCorrido(500, [{ tipo: "salida" as const, valor: 200 }]);
    expect(r[0].saldo).toBe(300);
  });
});

describe("movimientoDesdePago", () => {
  it("genera una salida por el neto (valor − retención)", () => {
    expect(movimientoDesdePago({ valor: 1_000_000, retencionTotal: 25_000 })).toEqual({
      tipo: "salida",
      valor: 975_000,
    });
  });
  it("sin retención la salida es el valor completo", () => {
    expect(movimientoDesdePago({ valor: 500_000, retencionTotal: 0 })).toEqual({
      tipo: "salida",
      valor: 500_000,
    });
  });
});
