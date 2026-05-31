// src/lib/domain/reportes.test.ts
import { describe, it, expect } from "vitest";
import { tramoAging, margenPorc, ticketPromedio, efectividadVisitas } from "./reportes";

describe("tramoAging", () => {
  it("corriente cuando no está vencido (<=0 días)", () => {
    expect(tramoAging(0)).toBe("Corriente");
    expect(tramoAging(-5)).toBe("Corriente");
  });
  it("clasifica por tramos", () => {
    expect(tramoAging(1)).toBe("1-30");
    expect(tramoAging(30)).toBe("1-30");
    expect(tramoAging(31)).toBe("31-60");
    expect(tramoAging(60)).toBe("31-60");
    expect(tramoAging(61)).toBe("61-90");
    expect(tramoAging(91)).toBe("+90");
  });
});

describe("margenPorc", () => {
  it("margen sobre precio", () => {
    expect(margenPorc(1000, 600)).toBe(40); // (1000-600)/1000
  });
  it("0 si precio es 0", () => {
    expect(margenPorc(0, 600)).toBe(0);
  });
});

describe("ticketPromedio", () => {
  it("total / n", () => {
    expect(ticketPromedio(1000, 4)).toBe(250);
  });
  it("0 si no hay facturas", () => {
    expect(ticketPromedio(1000, 0)).toBe(0);
  });
});

describe("efectividadVisitas", () => {
  it("% de visitas con pago o abono", () => {
    expect(efectividadVisitas(7, 10)).toBe(70);
  });
  it("0 si no hubo visitas", () => {
    expect(efectividadVisitas(0, 0)).toBe(0);
  });
});
