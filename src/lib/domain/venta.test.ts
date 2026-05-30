import { describe, it, expect } from "vitest";
import { buscarProductos, type ProductoBuscable } from "./venta";
import { agregarOIncrementar, type LineaCarrito } from "./venta";
import { precioSugerido } from "./venta";

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

describe("agregarOIncrementar", () => {
  it("agrega una línea nueva con cantidad 1 y el precio sugerido", () => {
    expect(agregarOIncrementar([], 5, 1200)).toEqual([{ productoId: 5, cantidad: 1, precioUnitario: 1200 }] satisfies LineaCarrito[]);
  });
  it("si el producto ya está, suma 1 a la cantidad (no duplica ni cambia el precio)", () => {
    const carrito: LineaCarrito[] = [{ productoId: 5, cantidad: 2, precioUnitario: 1200 }];
    expect(agregarOIncrementar(carrito, 5, 9999)).toEqual([{ productoId: 5, cantidad: 3, precioUnitario: 1200 }]);
  });
  it("no muta el carrito original", () => {
    const carrito: LineaCarrito[] = [{ productoId: 5, cantidad: 1, precioUnitario: 100 }];
    agregarOIncrementar(carrito, 5, 100);
    expect(carrito[0].cantidad).toBe(1);
  });
});

describe("precioSugerido", () => {
  const base = { 1: 1000, 2: 2000 };
  it("usa el precio del cliente cuando existe", () => {
    expect(precioSugerido(1, { porCliente: { 1: 850 }, base })).toBe(850);
  });
  it("cae al base cuando el cliente no tiene precio para ese producto", () => {
    expect(precioSugerido(2, { porCliente: { 1: 850 }, base })).toBe(2000);
  });
  it("devuelve 0 si no hay ni cliente ni base", () => {
    expect(precioSugerido(9, { porCliente: {}, base })).toBe(0);
  });
});
