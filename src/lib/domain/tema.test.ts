// src/lib/domain/tema.test.ts
import { describe, it, expect } from "vitest";
import { contraste, temaCss } from "./tema";
import { getPaleta } from "@/lib/temas/paletas";

describe("contraste", () => {
  it("texto oscuro sobre color claro", () => {
    expect(contraste("#f59e0b")).toBe("#111111");
    expect(contraste("#ffffff")).toBe("#111111");
  });
  it("texto claro sobre color oscuro", () => {
    expect(contraste("#0b3b2e")).toBe("#ffffff");
    expect(contraste("#059669")).toBe("#ffffff");
  });
});

describe("temaCss", () => {
  it("cadena vacía si no hay paleta", () => {
    expect(temaCss(null)).toBe("");
  });
  it("inyecta las variables de marca", () => {
    const css = temaCss(getPaleta("oceano"));
    expect(css).toContain("--primary:#0284c7");
    expect(css).toContain("--accent:#f59e0b");
    expect(css).toContain("--sidebar:#0b2a3f");
    expect(css).toContain("--sidebar-primary:#0284c7");
    expect(css.startsWith(":root{")).toBe(true);
  });
});
