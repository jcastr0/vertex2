import { describe, it, expect } from "vitest";
import { bodegaSchema } from "./bodega";

describe("bodegaSchema", () => {
  it("acepta una bodega válida", () => {
    const r = bodegaSchema.safeParse({ codigo: "B01", nombre: "Bodega Central" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.esPrincipal).toBe(false);
  });

  it("rechaza código vacío", () => {
    const r = bodegaSchema.safeParse({ codigo: "", nombre: "X" });
    expect(r.success).toBe(false);
  });

  it("rechaza nombre que excede 100 caracteres", () => {
    const r = bodegaSchema.safeParse({ codigo: "B", nombre: "a".repeat(101) });
    expect(r.success).toBe(false);
  });
});
