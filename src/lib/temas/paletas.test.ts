// src/lib/temas/paletas.test.ts
import { describe, it, expect } from "vitest";
import { PALETAS, getPaleta } from "./paletas";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("PALETAS", () => {
  it("tiene 24 paletas con keys únicas", () => {
    expect(PALETAS.length).toBe(24);
    expect(new Set(PALETAS.map((p) => p.key)).size).toBe(24);
  });
  it("cada paleta tiene 3 colores hex válidos", () => {
    for (const p of PALETAS) {
      expect(p.primario).toMatch(HEX);
      expect(p.acento).toMatch(HEX);
      expect(p.sidebar).toMatch(HEX);
      expect(p.nombre.length).toBeGreaterThan(0);
      expect(p.familia.length).toBeGreaterThan(0);
    }
  });
  it("incluye la paleta por defecto 'esmeralda'", () => {
    expect(getPaleta("esmeralda")?.primario).toBe("#059669");
  });
});

describe("getPaleta", () => {
  it("devuelve null para key desconocida o null", () => {
    expect(getPaleta("noexiste")).toBeNull();
    expect(getPaleta(null)).toBeNull();
  });
});
