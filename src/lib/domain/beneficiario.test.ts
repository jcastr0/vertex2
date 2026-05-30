import { describe, it, expect } from "vitest";
import { resolverTitular } from "./beneficiario";

const proveedor = { nit: "830400004", nombre: "Distribuidora Central" };

describe("resolverTitular", () => {
  it("cuenta propia del proveedor → usa su NIT y nombre (sin repetir)", () => {
    expect(resolverTitular(true, proveedor, {})).toEqual(proveedor);
  });
  it("cuenta propia ignora lo que venga en manual", () => {
    expect(resolverTitular(true, proveedor, { nit: "999", nombre: "Otro" })).toEqual(proveedor);
  });
  it("otra persona/empresa → usa los datos capturados", () => {
    expect(resolverTitular(false, proveedor, { nit: "900100", nombre: "Factor SAS" })).toEqual({ nit: "900100", nombre: "Factor SAS" });
  });
  it("recorta espacios en los datos manuales", () => {
    expect(resolverTitular(false, proveedor, { nit: " 900100 ", nombre: " Factor SAS " })).toEqual({ nit: "900100", nombre: "Factor SAS" });
  });
});
