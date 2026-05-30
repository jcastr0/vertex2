import { describe, it, expect } from "vitest";
import { distribuirFIFO, totalAdeudado } from "./cobro";

const deudas = [
  { id: 1, saldo: 30000 }, // más antigua
  { id: 2, saldo: 50000 },
  { id: 3, saldo: 20000 },
];

describe("distribuirFIFO", () => {
  it("aplica a la deuda más antigua primero", () => {
    expect(distribuirFIFO(deudas, 20000)).toEqual([{ id: 1, abono: 20000 }]);
  });
  it("reparte entre varias deudas cuando el monto las cruza", () => {
    expect(distribuirFIFO(deudas, 60000)).toEqual([
      { id: 1, abono: 30000 },
      { id: 2, abono: 30000 },
    ]);
  });
  it("cubre todo y no sobrepasa el total (sin sobrepago)", () => {
    expect(distribuirFIFO(deudas, 999999)).toEqual([
      { id: 1, abono: 30000 },
      { id: 2, abono: 50000 },
      { id: 3, abono: 20000 },
    ]);
  });
  it("monto 0 o negativo no aplica nada", () => {
    expect(distribuirFIFO(deudas, 0)).toEqual([]);
    expect(distribuirFIFO(deudas, -5)).toEqual([]);
  });
  it("salta deudas en saldo 0", () => {
    expect(distribuirFIFO([{ id: 9, saldo: 0 }, { id: 10, saldo: 100 }], 50)).toEqual([{ id: 10, abono: 50 }]);
  });
});

describe("totalAdeudado", () => {
  it("suma los saldos", () => {
    expect(totalAdeudado(deudas)).toBe(100000);
  });
});
