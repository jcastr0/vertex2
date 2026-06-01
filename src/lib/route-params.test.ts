import { describe, it, expect } from "vitest";
import { parseId } from "./route-params";

describe("parseId", () => {
  it("devuelve el número para un id válido", () => {
    expect(parseId("5")).toBe(5);
    expect(parseId("123")).toBe(123);
  });
  it("responde 404 (lanza) para segmentos no numéricos", () => {
    expect(() => parseId("nuevo")).toThrow();
    expect(() => parseId("nueva")).toThrow();
    expect(() => parseId("abc")).toThrow();
    expect(() => parseId("")).toThrow();
  });
  it("responde 404 para 0, negativos y decimales", () => {
    expect(() => parseId("0")).toThrow();
    expect(() => parseId("-3")).toThrow();
    expect(() => parseId("2.5")).toThrow();
  });
});
