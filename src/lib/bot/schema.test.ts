import { describe, it, expect } from "vitest";
import { salidaPedidoSchema } from "./schema";

describe("salidaPedidoSchema", () => {
  it("parsea items con productoId, nombre y cantidad", () => {
    const r = salidaPedidoSchema.safeParse({
      items: [
        { productoId: 1, nombre: "Tomate", cantidad: 10 },
        { productoId: null, nombre: "algo raro", cantidad: 2 },
      ],
      notas: "cliente con afán",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items).toHaveLength(2);
  });
  it("rechaza cantidad no positiva", () => {
    const r = salidaPedidoSchema.safeParse({ items: [{ productoId: 1, nombre: "x", cantidad: 0 }] });
    expect(r.success).toBe(false);
  });
});
