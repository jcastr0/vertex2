import { describe, it, expect } from "vitest";
import { aplicarAbono } from "./cartera";

describe("aplicarAbono", () => {
  it("abono parcial reduce el saldo", () => {
    expect(aplicarAbono(1000, 300)).toEqual({ nuevoSaldo: 700, aplicado: 300, excedente: 0 });
  });
  it("abono igual al saldo lo deja en 0", () => {
    expect(aplicarAbono(1000, 1000)).toEqual({ nuevoSaldo: 0, aplicado: 1000, excedente: 0 });
  });
  it("abono mayor: aplica hasta el saldo y devuelve excedente", () => {
    expect(aplicarAbono(1000, 1200)).toEqual({ nuevoSaldo: 0, aplicado: 1000, excedente: 200 });
  });
  it("saldo 0: nada se aplica, todo es excedente", () => {
    expect(aplicarAbono(0, 100)).toEqual({ nuevoSaldo: 0, aplicado: 0, excedente: 100 });
  });
  it("lanza si el abono es negativo o cero", () => {
    expect(() => aplicarAbono(100, 0)).toThrow();
    expect(() => aplicarAbono(100, -5)).toThrow();
  });
});
