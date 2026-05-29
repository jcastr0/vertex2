import { describe, it, expect } from "vitest";
import { prorratearCostos, costoPromedioPonderado, costoUnitarioBase } from "./costeo";

describe("prorratearCostos", () => {
  it("reparte el costo adicional proporcional al subtotal de cada línea", () => {
    expect(prorratearCostos([100, 300], 40)).toEqual([10, 30]);
  });
  it("reparte equitativo cuando todos los subtotales son iguales", () => {
    expect(prorratearCostos([50, 50], 10)).toEqual([5, 5]);
  });
  it("devuelve ceros si no hay costo adicional", () => {
    expect(prorratearCostos([100, 300], 0)).toEqual([0, 0]);
  });
  it("devuelve ceros si la suma de subtotales es 0", () => {
    expect(prorratearCostos([0, 0], 50)).toEqual([0, 0]);
  });
});

describe("costoPromedioPonderado", () => {
  it("la primera entrada fija el costo promedio", () => {
    expect(costoPromedioPonderado(0, 0, 10, 100)).toEqual({ cantidad: 10, costoPromedio: 100 });
  });
  it("promedia ponderando por cantidad", () => {
    // 10 @100 + 10 @200 = 20 @150
    expect(costoPromedioPonderado(10, 100, 10, 200)).toEqual({ cantidad: 20, costoPromedio: 150 });
  });
  it("ponderación no trivial", () => {
    // 30 @100 + 10 @200 = 40 @125
    expect(costoPromedioPonderado(30, 100, 10, 200)).toEqual({ cantidad: 40, costoPromedio: 125 });
  });
});

describe("costoUnitarioBase", () => {
  it("divide el costo total entre la cantidad en unidades base", () => {
    expect(costoUnitarioBase(200000, 125)).toBe(1600);
  });
  it("lanza si la cantidad base es 0", () => {
    expect(() => costoUnitarioBase(1000, 0)).toThrow();
  });
});
