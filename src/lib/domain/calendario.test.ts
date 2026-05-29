import { describe, it, expect } from "vitest";
import { construirCalendario } from "./calendario";

describe("construirCalendario (semana inicia lunes)", () => {
  it("febrero 2026 empieza domingo -> 6 celdas vacías y luego 1..28", () => {
    const g = construirCalendario(2026, 1); // month0=1 => febrero
    expect(g).toHaveLength(42);
    expect(g.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(g[6]).toBe(1);
    expect(g[33]).toBe(28);
    expect(g[34]).toBeNull();
  });

  it("incluye todos los días del mes", () => {
    const g = construirCalendario(2026, 0); // enero (31 días)
    const dias = g.filter((d): d is number => d !== null);
    expect(dias).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });
});
