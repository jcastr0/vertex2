import { describe, it, expect } from "vitest";
import { ROLES, puede, type Permiso } from "./roles";

describe("roles y permisos", () => {
  it("define los 6 roles de Vertex", () => {
    expect(Object.keys(ROLES)).toEqual([
      "SuperAdmin",
      "Admin",
      "Operador",
      "Vendedor",
      "Bodega",
      "Contador",
    ]);
  });

  it("SuperAdmin puede todo (comodín)", () => {
    expect(puede("SuperAdmin", "empresas.eliminar")).toBe(true);
    expect(puede("SuperAdmin", "facturas.crear")).toBe(true);
  });

  it("Vendedor puede crear facturas pero no ver compras", () => {
    expect(puede("Vendedor", "facturas.crear")).toBe(true);
    expect(puede("Vendedor", "pedidos.crear" as Permiso)).toBe(false);
  });

  it("Contador es solo lectura: ve facturas pero no las crea", () => {
    expect(puede("Contador", "facturas.ver")).toBe(true);
    expect(puede("Contador", "facturas.crear")).toBe(false);
  });

  it("rol desconocido no puede nada", () => {
    expect(puede("Inexistente", "facturas.ver")).toBe(false);
  });
});
