import { describe, it, expect } from "vitest";
import { resolverConfig } from "./configuracion";

describe("resolverConfig", () => {
  it("usa el valor de la empresa si existe", () => {
    expect(resolverConfig(true, false, false)).toBe(true);
  });
  it("cae al global si la empresa no tiene valor", () => {
    expect(resolverConfig(undefined, true, false)).toBe(true);
  });
  it("cae al default si no hay empresa ni global", () => {
    expect(resolverConfig(undefined, undefined, "x")).toBe("x");
  });
  it("respeta un valor falsy de la empresa (no lo trata como ausente)", () => {
    expect(resolverConfig(false, true, true)).toBe(false);
  });
});
