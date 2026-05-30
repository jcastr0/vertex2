import { describe, it, expect } from "vitest";
import { usuarioSchema } from "./usuario";

describe("usuarioSchema", () => {
  it("acepta un usuario válido con contraseña", () => {
    const r = usuarioSchema.safeParse({ nombre: "Ana", email: "ana@x.co", rolId: 2, password: "secreta1" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.activo).toBe(true);
  });
  it("permite sin contraseña (edición)", () => {
    expect(usuarioSchema.safeParse({ nombre: "Ana", email: "ana@x.co", rolId: 2, password: "" }).success).toBe(true);
  });
  it("rechaza contraseña corta", () => {
    expect(usuarioSchema.safeParse({ nombre: "Ana", email: "ana@x.co", rolId: 2, password: "123" }).success).toBe(false);
  });
  it("rechaza email inválido y rol no positivo", () => {
    expect(usuarioSchema.safeParse({ nombre: "Ana", email: "no-email", rolId: 2 }).success).toBe(false);
    expect(usuarioSchema.safeParse({ nombre: "Ana", email: "ana@x.co", rolId: 0 }).success).toBe(false);
  });
});
