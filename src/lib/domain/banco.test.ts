import { describe, it, expect } from "vitest";
import { slugBanco } from "./banco";

describe("slugBanco", () => {
  it("convierte el nombre a slug en minúsculas con guiones", () => {
    expect(slugBanco("Banco de Bogotá")).toBe("banco-de-bogota");
  });
  it("quita tildes y vuelve separador los caracteres especiales", () => {
    expect(slugBanco("Citibank Colombia S.A.")).toBe("citibank-colombia-s-a");
  });
  it("colapsa espacios múltiples y recorta", () => {
    expect(slugBanco("  Nu   Colombia  ")).toBe("nu-colombia");
  });
  it("limita la longitud a 30 caracteres", () => {
    expect(slugBanco("Cooperativa Financiera de Antioquia del Norte").length).toBeLessThanOrEqual(30);
  });
  it("evita colisiones sufijando -2, -3…", () => {
    expect(slugBanco("Nequi", ["nequi"])).toBe("nequi-2");
    expect(slugBanco("Nequi", ["nequi", "nequi-2"])).toBe("nequi-3");
  });
  it("sin colisión devuelve el slug base", () => {
    expect(slugBanco("Nequi", ["bancolombia"])).toBe("nequi");
  });
});
