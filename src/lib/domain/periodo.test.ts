import { describe, it, expect } from "vitest";
import { rangoMes } from "./periodo";

describe("rangoMes", () => {
  it("mayo 2026 -> 01 a 31", () => {
    expect(rangoMes(2026, 4)).toEqual({ desde: "2026-05-01", hasta: "2026-05-31" });
  });
  it("febrero 2026 (no bisiesto) -> 01 a 28", () => {
    expect(rangoMes(2026, 1)).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
  });
  it("febrero 2024 (bisiesto) -> 01 a 29", () => {
    expect(rangoMes(2024, 1)).toEqual({ desde: "2024-02-01", hasta: "2024-02-29" });
  });
  it("diciembre -> 01 a 31", () => {
    expect(rangoMes(2026, 11)).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" });
  });
});
