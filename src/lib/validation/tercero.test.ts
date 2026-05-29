import { describe, it, expect } from "vitest";
import { terceroSchema } from "./tercero";

describe("terceroSchema", () => {
  it("acepta un proveedor válido y aplica defaults", () => {
    const r = terceroSchema.safeParse({
      tipo: "proveedor",
      codigo: "P001",
      razonSocial: "Distribuidora ACME",
      identificacion: "900373115",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoIdentificacion).toBe("NIT");
      expect(r.data.tipoPersona).toBe("juridica");
      expect(r.data.cupoCredito).toBe(0);
      expect(r.data.requiereFacturaElectronica).toBe(false);
    }
  });

  it("rechaza razón social vacía", () => {
    const r = terceroSchema.safeParse({
      tipo: "cliente",
      codigo: "C001",
      razonSocial: "",
      identificacion: "123",
    });
    expect(r.success).toBe(false);
  });

  it("coacciona cupo de crédito numérico desde string", () => {
    const r = terceroSchema.safeParse({
      tipo: "cliente",
      codigo: "C002",
      razonSocial: "Cliente X",
      identificacion: "123",
      cupoCredito: "1500000",
    });
    expect(r.success && r.data.cupoCredito).toBe(1500000);
  });

  it("rechaza tipo inválido", () => {
    const r = terceroSchema.safeParse({
      tipo: "otro",
      codigo: "X",
      razonSocial: "X",
      identificacion: "1",
    });
    expect(r.success).toBe(false);
  });
});
