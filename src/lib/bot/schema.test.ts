import { describe, it, expect } from "vitest";
import { salidaPedidoSchema } from "./schema";

describe("salidaPedidoSchema", () => {
  it("parsea items + mensajeAsistente + completo", () => {
    const r = salidaPedidoSchema.safeParse({
      items: [{ productoId: 1, nombre: "Tomate", cantidad: 10 }],
      mensajeAsistente: "¡Hola! Entendí tu pedido.",
      completo: true,
    });
    expect(r.success).toBe(true);
  });
  it("rechaza si falta mensajeAsistente", () => {
    const r = salidaPedidoSchema.safeParse({ items: [], completo: false });
    expect(r.success).toBe(false);
  });
});
