import { describe, it, expect } from "vitest";
import { calcularRetenciones, type RetencionConfig } from "./retenciones";

const ret = (over: Partial<RetencionConfig>): RetencionConfig => ({
  id: 1,
  nombre: "Retefuente",
  porcentaje: 2.5,
  baseMinima: 500000,
  aplicaTodas: true,
  activa: true,
  ...over,
});

describe("calcularRetenciones", () => {
  it("aplica el % cuando hay FE y la base supera la mínima", () => {
    const r = calcularRetenciones(1_000_000, [ret({})], true);
    expect(r.total).toBe(25000);
    expect(r.detalle[0]).toMatchObject({ retencionId: 1, base: 1_000_000, porcentaje: 2.5, valor: 25000 });
  });

  it("NO aplica si no hay factura electrónica", () => {
    expect(calcularRetenciones(1_000_000, [ret({})], false)).toEqual({ detalle: [], total: 0 });
  });

  it("NO aplica por debajo de la base mínima", () => {
    expect(calcularRetenciones(100_000, [ret({})], true).total).toBe(0);
  });

  it("ignora retenciones inactivas o que no aplican a todas", () => {
    expect(calcularRetenciones(1_000_000, [ret({ activa: false })], true).total).toBe(0);
    expect(calcularRetenciones(1_000_000, [ret({ aplicaTodas: false })], true).total).toBe(0);
  });

  it("suma varias retenciones aplicables", () => {
    const r = calcularRetenciones(1_000_000, [
      ret({ id: 1, porcentaje: 2.5, baseMinima: 0 }),
      ret({ id: 2, nombre: "ReteICA", porcentaje: 1, baseMinima: 0 }),
    ], true);
    expect(r.total).toBe(35000);
    expect(r.detalle).toHaveLength(2);
  });

  it("redondea al peso", () => {
    expect(calcularRetenciones(333_333, [ret({ baseMinima: 0 })], true).total).toBe(8333);
  });
});
