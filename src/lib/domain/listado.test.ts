import { describe, it, expect } from "vitest";
import { filtrarPaginar, parsePage, hrefPaginaFactory } from "./listado";

const items = [
  { n: "Arroz" },
  { n: "Azúcar" },
  { n: "Café" },
  { n: "Cacao" },
  { n: "Sal" },
  { n: "Té" },
];
const texto = (x: { n: string }) => x.n;

describe("filtrarPaginar", () => {
  it("pagina (página 1)", () => {
    const r = filtrarPaginar(items, { page: 1, pageSize: 2, texto });
    expect(r.items.map((i) => i.n)).toEqual(["Arroz", "Azúcar"]);
    expect(r.total).toBe(6);
    expect(r.totalPaginas).toBe(3);
  });
  it("pagina (página 2)", () => {
    const r = filtrarPaginar(items, { page: 2, pageSize: 2, texto });
    expect(r.items.map((i) => i.n)).toEqual(["Café", "Cacao"]);
  });
  it("filtra por texto (case-insensitive) y resetea total", () => {
    const r = filtrarPaginar(items, { q: "CA", page: 1, pageSize: 10, texto });
    // 'ca' aparece en Azú(ca)r, Café (Ca) y Cacao
    expect(r.items.map((i) => i.n)).toEqual(["Azúcar", "Café", "Cacao"]);
    expect(r.total).toBe(3);
  });
  it("acentos: 'cafe' no encuentra 'Café' (búsqueda literal)", () => {
    const r = filtrarPaginar(items, { q: "café", page: 1, pageSize: 10, texto });
    expect(r.total).toBe(1);
  });
  it("clampa página fuera de rango a la última", () => {
    const r = filtrarPaginar(items, { page: 99, pageSize: 2, texto });
    expect(r.page).toBe(3);
    expect(r.items.map((i) => i.n)).toEqual(["Sal", "Té"]);
  });
  it("lista vacía: total 0, página 1", () => {
    const r = filtrarPaginar([], { page: 1, pageSize: 2, texto: () => "" });
    expect(r).toMatchObject({ total: 0, page: 1, totalPaginas: 1, items: [] });
  });
});

describe("parsePage", () => {
  it("normaliza valores inválidos a 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });
});

describe("hrefPaginaFactory", () => {
  const href = hrefPaginaFactory("/productos", "arroz");
  it("conserva q y agrega page solo si > 1", () => {
    expect(href(1)).toBe("/productos?q=arroz");
    expect(href(2)).toBe("/productos?q=arroz&page=2");
  });
  it("sin q ni page devuelve la base", () => {
    expect(hrefPaginaFactory("/bodegas", "")(1)).toBe("/bodegas");
  });
});
