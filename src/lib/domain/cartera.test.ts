import { describe, it, expect } from "vitest";
import { aplicarAbono, estadoCartera } from "./cartera";

describe("estadoCartera", () => {
  const hoy = "2026-05-29";
  it("saldo 0 => pagada (aunque esté vencida)", () => {
    expect(estadoCartera(0, "2026-01-01", hoy)).toBe("pagada");
  });
  it("con saldo y vencimiento pasado => vencida", () => {
    expect(estadoCartera(1000, "2026-05-01", hoy)).toBe("vencida");
  });
  it("con saldo y vencimiento futuro => pendiente", () => {
    expect(estadoCartera(1000, "2026-06-10", hoy)).toBe("pendiente");
  });
  it("vence hoy => pendiente (aún no vencida)", () => {
    expect(estadoCartera(1000, hoy, hoy)).toBe("pendiente");
  });
});

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
