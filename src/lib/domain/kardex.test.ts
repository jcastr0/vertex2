import { describe, it, expect } from "vitest";
import { origenDocumento } from "./kardex";

describe("origenDocumento", () => {
  it("factura → /facturas/{id} con el número como etiqueta", () => {
    expect(origenDocumento({ facturaId: 30, referencia: "FAC-000027" })).toEqual({ href: "/facturas/30", label: "FAC-000027" });
  });
  it("pedido → /pedidos/{id}", () => {
    expect(origenDocumento({ pedidoId: 8, referencia: "PED-000008" })).toEqual({ href: "/pedidos/8", label: "PED-000008" });
  });
  it("traslado → /traslados/{id}", () => {
    expect(origenDocumento({ trasladoId: 5, referencia: "TR-5" })).toEqual({ href: "/traslados/5", label: "TR-5" });
  });
  it("sin documento (ajuste / saldo inicial) → null", () => {
    expect(origenDocumento({ referencia: "Saldo inicial" })).toBeNull();
    expect(origenDocumento({ facturaId: null, pedidoId: null, trasladoId: null })).toBeNull();
  });
  it("usa una etiqueta por defecto si no hay referencia", () => {
    expect(origenDocumento({ facturaId: 7, referencia: null })).toEqual({ href: "/facturas/7", label: "Factura" });
  });
});
