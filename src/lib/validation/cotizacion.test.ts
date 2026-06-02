import { describe, it, expect } from "vitest";
import { parseCotizacionForm } from "./cotizacion";

function form(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  return f;
}

describe("parseCotizacionForm", () => {
  it("acepta cliente + fecha + líneas válidas", () => {
    const r = parseCotizacionForm(form({
      clienteId: "5",
      fecha: "2026-06-02",
      lineasJson: JSON.stringify([{ productoId: 1, cantidad: 2, precioUnitario: 1500 }]),
    }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.clienteId).toBe(5);
      expect(r.data.lineas).toHaveLength(1);
    }
  });
  it("rechaza si no hay líneas", () => {
    const r = parseCotizacionForm(form({ clienteId: "5", fecha: "2026-06-02", lineasJson: "[]" }));
    expect(r.success).toBe(false);
  });
  it("rechaza sin cliente", () => {
    const r = parseCotizacionForm(form({ clienteId: "0", fecha: "2026-06-02", lineasJson: JSON.stringify([{ productoId: 1, cantidad: 1, precioUnitario: 100 }]) }));
    expect(r.success).toBe(false);
  });
});
