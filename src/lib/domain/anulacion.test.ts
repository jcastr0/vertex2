import { describe, it, expect } from "vitest";
import { puedeAnular, diferenciaArqueo } from "./anulacion";

describe("puedeAnular", () => {
  it("bloquea si no está emitida", () => {
    expect(puedeAnular("anulada", 100, 100, "contado").ok).toBe(false);
    expect(puedeAnular("borrador", 100, 100, "credito").ok).toBe(false);
  });
  it("crédito sin abonos (saldo == total) se puede", () => {
    expect(puedeAnular("emitida", 100, 100, "credito").ok).toBe(true);
  });
  it("crédito con abonos (saldo < total) se bloquea", () => {
    const r = puedeAnular("emitida", 40, 100, "credito");
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/cobros|recaudos/i);
  });
  it("contado siempre se puede si está emitida", () => {
    expect(puedeAnular("emitida", 0, 100, "contado").ok).toBe(true);
  });
});

describe("diferenciaArqueo", () => {
  it("contado menos esperado", () => {
    expect(diferenciaArqueo(100000, 98000)).toBe(-2000);
    expect(diferenciaArqueo(100000, 100000)).toBe(0);
    expect(diferenciaArqueo(100000, 105000)).toBe(5000);
  });
});
