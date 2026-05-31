import { describe, it, expect } from "vitest";
import { resumenInventarioBodega } from "./fichas";

describe("resumenInventarioBodega", () => {
  it("cuenta productos con y sin existencia y suma el valor", () => {
    const r = resumenInventarioBodega([
      { existencia: 10, valor: 1000 },
      { existencia: 0, valor: 0 },
      { existencia: -2, valor: 0 },
      { existencia: 5.5, valor: 250 },
    ]);
    expect(r.productosDistintos).toBe(2);
    expect(r.sinExistencia).toBe(2);
    expect(r.valorInventario).toBe(1250);
  });
  it("lista vacía → ceros", () => {
    expect(resumenInventarioBodega([])).toEqual({ productosDistintos: 0, sinExistencia: 0, valorInventario: 0 });
  });
});
