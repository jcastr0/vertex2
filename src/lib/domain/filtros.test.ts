import { describe, it, expect } from "vitest";
import { aplicarFiltro, limpiarFiltros, filtrosActivos, type FiltroDef } from "./filtros";

const defs: FiltroDef[] = [
  { key: "estado", label: "Estado", tipo: "select", opciones: [{ value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }] },
  { key: "desde", label: "Desde", tipo: "fecha" },
];
const sp = (s: string) => new URLSearchParams(s);

describe("aplicarFiltro", () => {
  it("pone el valor y resetea page", () => {
    const r = aplicarFiltro(sp("page=3"), "estado", "activo");
    expect(r.get("estado")).toBe("activo");
    expect(r.has("page")).toBe(false);
  });
  it("valor vacío borra el filtro", () => {
    expect(aplicarFiltro(sp("estado=activo"), "estado", "").has("estado")).toBe(false);
  });
});
describe("limpiarFiltros", () => {
  it("borra q y todas las keys", () => {
    const r = limpiarFiltros(sp("q=x&estado=activo&desde=2026-01-01&page=2"), ["estado", "desde"]);
    expect(r.toString()).toBe("");
  });
});
describe("filtrosActivos", () => {
  it("devuelve chips legibles (usa label de opción en selects)", () => {
    expect(filtrosActivos(sp("estado=activo&desde=2026-01-01"), defs)).toEqual([
      { key: "estado", label: "Estado", valor: "Activo" },
      { key: "desde", label: "Desde", valor: "2026-01-01" },
    ]);
  });
  it("ignora params que no son filtros declarados", () => {
    expect(filtrosActivos(sp("q=hola&page=2"), defs)).toEqual([]);
  });
});
