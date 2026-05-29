import { describe, it, expect } from "vitest";
import { elegirEmpresa } from "./empresa-resolver";

describe("elegirEmpresa", () => {
  it("usuario normal: su propia empresa", () => {
    expect(elegirEmpresa(7, false, null, 1)).toBe(7);
  });
  it("usuario normal sin empresa: null (aunque haya primera)", () => {
    expect(elegirEmpresa(null, false, null, 1)).toBeNull();
  });
  it("superadmin sin cookie: la primera empresa", () => {
    expect(elegirEmpresa(null, true, null, 3)).toBe(3);
  });
  it("superadmin con cookie válida: la de la cookie", () => {
    expect(elegirEmpresa(null, true, "5", 3)).toBe(5);
  });
  it("superadmin con cookie inválida: cae a la primera", () => {
    expect(elegirEmpresa(null, true, "abc", 3)).toBe(3);
  });
  it("superadmin sin empresas: null", () => {
    expect(elegirEmpresa(null, true, null, null)).toBeNull();
  });
});
