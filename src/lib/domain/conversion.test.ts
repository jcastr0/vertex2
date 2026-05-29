import { describe, it, expect } from "vitest";
import { cantidadEnBase, precioCalculado, precioBaseDesdeUnidad } from "./conversion";

/**
 * Convención: `factor` = cuántas unidades base equivale 1 unidad de esta
 * presentación. Ej.: base = libra, presentación = bulto, factor = 125
 * (1 bulto = 125 libras).
 */
describe("conversión de unidades", () => {
  describe("cantidadEnBase", () => {
    it("convierte cantidad de la presentación a unidades base", () => {
      expect(cantidadEnBase(2, 125)).toBe(250); // 2 bultos = 250 libras
    });
    it("la unidad base (factor 1) no cambia", () => {
      expect(cantidadEnBase(7, 1)).toBe(7);
    });
    it("soporta factores fraccionarios", () => {
      expect(cantidadEnBase(3, 0.5)).toBe(1.5);
    });
  });

  describe("precioCalculado", () => {
    it("precio de la presentación = precio base × factor", () => {
      // libra a $1.600 -> bulto (125) = $200.000
      expect(precioCalculado(1600, 125)).toBe(200000);
    });
    it("para la unidad base devuelve el mismo precio", () => {
      expect(precioCalculado(1600, 1)).toBe(1600);
    });
  });

  describe("precioBaseDesdeUnidad", () => {
    it("deriva el precio base desde el precio de una presentación", () => {
      // bulto a $200.000 (125) -> libra = $1.600
      expect(precioBaseDesdeUnidad(200000, 125)).toBe(1600);
    });
    it("lanza si el factor es 0", () => {
      expect(() => precioBaseDesdeUnidad(1000, 0)).toThrow();
    });
  });
});
