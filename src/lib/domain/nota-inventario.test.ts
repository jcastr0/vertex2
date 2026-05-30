import { describe, it, expect } from "vitest";
import { TIPOS_NOTA, signoNota, esEntrada } from "./nota-inventario";
import { esNovedadProveedor } from "./nota-inventario";

describe("signoNota", () => {
  it("entradas suman (+1)", () => {
    expect(signoNota("diferencia_positiva")).toBe(1);
    expect(signoNota("ajuste_entrada")).toBe(1);
  });
  it("salidas restan (-1)", () => {
    expect(signoNota("merma")).toBe(-1);
    expect(signoNota("dano")).toBe(-1);
    expect(signoNota("diferencia_negativa")).toBe(-1);
    expect(signoNota("ajuste_salida")).toBe(-1);
  });
  it("lanza con tipo desconocido", () => {
    expect(() => signoNota("xxx")).toThrow();
  });
  it("esEntrada coincide con signo +1", () => {
    expect(esEntrada("diferencia_positiva")).toBe(true);
    expect(esEntrada("merma")).toBe(false);
  });
  it("todos los TIPOS_NOTA tienen signo definido", () => {
    for (const t of TIPOS_NOTA) expect([1, -1]).toContain(signoNota(t.value));
  });
});

describe("esNovedadProveedor", () => {
  it("faltante, merma y daño son novedad del proveedor (calidad)", () => {
    expect(esNovedadProveedor("diferencia_negativa")).toBe(true);
    expect(esNovedadProveedor("merma")).toBe(true);
    expect(esNovedadProveedor("dano")).toBe(true);
  });
  it("sobrante y ajustes internos NO son novedad del proveedor", () => {
    expect(esNovedadProveedor("diferencia_positiva")).toBe(false);
    expect(esNovedadProveedor("ajuste_entrada")).toBe(false);
    expect(esNovedadProveedor("ajuste_salida")).toBe(false);
  });
});
