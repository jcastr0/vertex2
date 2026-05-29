import { describe, it, expect } from "vitest";
import { MANUALES, getManual } from "./manuales";

describe("getManual", () => {
  it("devuelve el manual por slug", () => {
    expect(getManual("vender")?.titulo).toBe("Cómo vender");
  });
  it("devuelve null si no existe", () => {
    expect(getManual("inexistente")).toBeNull();
  });
  it("todos los manuales tienen slug único y contenido", () => {
    const slugs = MANUALES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const m of MANUALES) expect(m.contenido.length).toBeGreaterThan(20);
  });
});
