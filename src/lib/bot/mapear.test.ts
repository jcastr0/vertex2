import { describe, it, expect } from "vitest";
import { mapearPropuesta } from "./mapear";

const catalogo = [
  { id: 1, nombre: "Tomate chonto", sku: "VRD-001", precio: 3000 },
  { id: 2, nombre: "Cebolla", sku: "VRD-002", precio: 2000 },
];

describe("mapearPropuesta", () => {
  it("empareja por productoId y usa el precio del historial del cliente (cae a catálogo)", () => {
    const salida = { items: [
      { productoId: 1, nombre: "tomate", cantidad: 10 },
      { productoId: 2, nombre: "cebolla", cantidad: 5 },
    ] };
    const p = mapearPropuesta(salida, catalogo, { 1: 3500 });
    expect(p.lineas).toEqual([
      { productoId: 1, nombre: "Tomate chonto", cantidad: 10, precioUnitario: 3500, subtotal: 35000 },
      { productoId: 2, nombre: "Cebolla", cantidad: 5, precioUnitario: 2000, subtotal: 10000 },
    ]);
    expect(p.total).toBe(45000);
    expect(p.noReconocidos).toEqual([]);
  });

  it("manda a noReconocidos los items sin productoId o con id inexistente (nunca inventa)", () => {
    const salida = { items: [
      { productoId: null, nombre: "ajonjolí morado", cantidad: 2 },
      { productoId: 999, nombre: "fantasma", cantidad: 1 },
    ] };
    const p = mapearPropuesta(salida, catalogo, {});
    expect(p.lineas).toEqual([]);
    expect(p.noReconocidos).toEqual(["2 × ajonjolí morado", "1 × fantasma"]);
  });

  it("el resumen menciona las líneas y lo no reconocido", () => {
    const salida = { items: [
      { productoId: 1, nombre: "tomate", cantidad: 10 },
      { productoId: null, nombre: "perejil", cantidad: 1 },
    ] };
    const p = mapearPropuesta(salida, catalogo, {});
    expect(p.resumen).toContain("Tomate chonto");
    expect(p.resumen).toContain("perejil");
  });
});
