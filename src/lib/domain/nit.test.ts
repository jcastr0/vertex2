import { describe, it, expect } from "vitest";
import { calcularDV, digitoVerificacionPara } from "./nit";

describe("calcularDV (NIT colombiano, algoritmo DIAN)", () => {
  it("calcula el DV de un NIT de 9 dígitos", () => {
    // 900373115 -> sum ponderada 657, 657%11=8, DV=11-8=3
    expect(calcularDV("900373115")).toBe(3);
  });

  it("calcula el DV de otro NIT", () => {
    // 900123456 -> sum 586, 586%11=3, DV=11-3=8
    expect(calcularDV("900123456")).toBe(8);
  });

  it("cuando el módulo es <= 1, el DV es el módulo mismo", () => {
    // 4 -> 4*3=12, 12%11=1 -> DV=1
    expect(calcularDV("4")).toBe(1);
  });

  it("ignora puntos, espacios y guiones", () => {
    expect(calcularDV("900.373.115")).toBe(3);
    expect(calcularDV(" 900 373 115 ")).toBe(3);
  });

  it("lanza si no hay dígitos", () => {
    expect(() => calcularDV("")).toThrow();
    expect(() => calcularDV("abc")).toThrow();
  });
});

describe("digitoVerificacionPara", () => {
  it("calcula el DV solo cuando el tipo es NIT", () => {
    expect(digitoVerificacionPara("NIT", "900373115")).toBe("3");
  });

  it("devuelve null para identificaciones que no son NIT", () => {
    expect(digitoVerificacionPara("CC", "79123456")).toBeNull();
    expect(digitoVerificacionPara("PASAPORTE", "AB123")).toBeNull();
  });
});
