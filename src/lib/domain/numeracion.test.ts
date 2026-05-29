import { describe, it, expect } from "vitest";
import { formatearNumero } from "./numeracion";

describe("formatearNumero", () => {
  it("formatea con prefijo y relleno de ceros a 6 dígitos", () => {
    expect(formatearNumero("PED", 1)).toBe("PED-000001");
    expect(formatearNumero("FAC", 123)).toBe("FAC-000123");
  });
  it("no recorta números de más de 6 dígitos", () => {
    expect(formatearNumero("REC", 1234567)).toBe("REC-1234567");
  });
});
