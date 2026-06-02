import { describe, it, expect } from "vitest";
import { totalCotizacion, puedeFacturar, puedeAnular } from "./cotizacion";

describe("totalCotizacion", () => {
  it("suma cantidad × precio de cada línea", () => {
    expect(totalCotizacion([{ cantidad: 2, precioUnitario: 1500 }, { cantidad: 3, precioUnitario: 1000 }])).toBe(6000);
  });
  it("ignora líneas sin cantidad o precio", () => {
    expect(totalCotizacion([{ cantidad: 0, precioUnitario: 1000 }, { cantidad: 5, precioUnitario: 0 }])).toBe(0);
  });
});

describe("guardias de estado", () => {
  it("solo se factura/anula una cotización pendiente", () => {
    expect(puedeFacturar("pendiente")).toBe(true);
    expect(puedeFacturar("facturada")).toBe(false);
    expect(puedeFacturar("anulada")).toBe(false);
    expect(puedeAnular("pendiente")).toBe(true);
    expect(puedeAnular("facturada")).toBe(false);
  });
});
