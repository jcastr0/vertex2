import { describe, it, expect } from "vitest";
import { buscarProductos, type ProductoBuscable } from "./venta";

const P = (id: number, nombre: string, sku: string): ProductoBuscable => ({ id, nombre, sku });
const lista = [P(1, "Tomate chonto", "VEG-01"), P(2, "Tomate larga vida", "VEG-02"), P(3, "Cebolla cabezona", "VEG-03"), P(4, "Papa criolla", "VEG-04")];

describe("buscarProductos", () => {
  it("filtra por nombre (case-insensitive)", () => {
    expect(buscarProductos(lista, "tomate", 10).map((p) => p.id)).toEqual([1, 2]);
  });
  it("filtra por SKU", () => {
    expect(buscarProductos(lista, "veg-03", 10).map((p) => p.id)).toEqual([3]);
  });
  it("rankea prefijo antes que substring", () => {
    const r = buscarProductos([P(1, "Verde cebolla", "X1"), P(2, "Cebolla larga", "X2")], "cebolla", 10);
    expect(r[0].id).toBe(2);
  });
  it("corta al límite", () => {
    expect(buscarProductos(lista, "a", 2).length).toBeLessThanOrEqual(2);
  });
  it("query vacía devuelve los primeros hasta el límite", () => {
    expect(buscarProductos(lista, "", 3).length).toBe(3);
  });
});
