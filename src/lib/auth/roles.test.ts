import { describe, it, expect } from "vitest";
import { ROLES, puede, MODULOS, MODULO_LABEL, type Permiso } from "./roles";

describe("puede (por lista de permisos)", () => {
  it("true si la lista incluye el permiso exacto", () => {
    expect(puede(["facturas.crear", "facturas.ver"], "facturas.crear")).toBe(true);
  });
  it("false si no lo incluye", () => {
    expect(puede(["facturas.ver"], "facturas.crear")).toBe(false);
  });
  it("el comodín * concede todo", () => {
    expect(puede(["*"], "ruta_recaudo.editar")).toBe(true);
  });
  it("lista vacía o nula = sin permiso", () => {
    expect(puede([], "facturas.ver")).toBe(false);
    expect(puede(null, "facturas.ver")).toBe(false);
  });
});

describe("catálogo", () => {
  it("incluye el módulo 'roles'", () => {
    expect(MODULOS).toContain("roles");
  });
  it("cada módulo tiene etiqueta legible", () => {
    for (const m of MODULOS) expect(MODULO_LABEL[m]?.length).toBeGreaterThan(0);
  });
  it("SuperAdmin tiene acceso total", () => {
    expect(ROLES.SuperAdmin).toEqual(["*"]);
  });
});
