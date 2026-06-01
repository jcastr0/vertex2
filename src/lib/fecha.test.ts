import { describe, it, expect } from "vitest";
import {
  fechaEnColombia,
  partesColombia,
  diaSemanaColombia,
  sumarDias,
  fechaCorta,
  fechaLarga,
  fechaInstante,
} from "./fecha";

describe("fecha — zona horaria Colombia (UTC−5)", () => {
  it("EL BUG: un instante de madrugada UTC sigue siendo el día anterior en Colombia", () => {
    // 2026-06-01 03:30 UTC = 2026-05-31 22:30 en Colombia.
    expect(fechaEnColombia(new Date("2026-06-01T03:30:00Z"))).toBe("2026-05-31");
  });
  it("después de las 5:00 UTC (medianoche Colombia) sí cambia el día", () => {
    expect(fechaEnColombia(new Date("2026-06-01T06:00:00Z"))).toBe("2026-06-01");
    expect(fechaEnColombia(new Date("2026-06-01T04:59:00Z"))).toBe("2026-05-31");
  });
  it("partesColombia da el mes correcto (no el de UTC)", () => {
    const p = partesColombia(new Date("2026-06-01T03:30:00Z"));
    expect(p).toEqual({ anio: 2026, mes: 4, dia: 31 }); // mayo = mes 4
  });
  it("diaSemanaColombia usa el día de Colombia (convención lun=1…dom=7)", () => {
    // 2026-05-31 es domingo (7). A las 03:30 UTC del 1-jun sigue siendo domingo en CO.
    expect(diaSemanaColombia(new Date("2026-06-01T03:30:00Z"))).toBe(7);
    // 2026-05-25 lunes → 1
    expect(diaSemanaColombia(new Date("2026-05-25T15:00:00Z"))).toBe(1);
  });
});

describe("fecha-solo (sin desplazar zona)", () => {
  it("fechaCorta y fechaLarga formatean el calendario tal cual", () => {
    expect(fechaCorta("2026-05-31")).toBe("31 may");
    expect(fechaLarga("2026-05-31")).toBe("31 may 2026");
    // NO debe restar un día por zona horaria:
    expect(fechaCorta("2026-01-01")).toBe("1 ene");
  });
  it("sumarDias hace aritmética de calendario correcta", () => {
    expect(sumarDias("2026-05-31", 1)).toBe("2026-06-01");
    expect(sumarDias("2026-05-31", 30)).toBe("2026-06-30");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("instantes (en hora de Colombia)", () => {
  it("fechaInstante muestra la fecha Colombia del instante", () => {
    // instante de madrugada UTC → fecha del día anterior en Colombia
    expect(fechaInstante("2026-06-01T03:30:00Z")).toBe("31 may 2026");
  });
});
