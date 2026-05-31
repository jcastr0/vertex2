import { describe, it, expect } from "vitest";
import { escposBytes } from "./recibo";

describe("escposBytes", () => {
  it("empieza con init ESC @ y termina con corte GS V", () => {
    const b = escposBytes(["VERTEX", "Total: $1.000"], { cortar: true });
    expect(b[0]).toBe(0x1b); expect(b[1]).toBe(0x40); // ESC @
    // corte al final: GS V 0  -> 0x1d 0x56 0x00
    expect(b[b.length - 3]).toBe(0x1d);
    expect(b[b.length - 2]).toBe(0x56);
  });
  it("incluye el texto de las líneas", () => {
    const b = escposBytes(["AB"], { cortar: false });
    const txt = Buffer.from(b).toString("latin1");
    expect(txt).toContain("AB");
  });
});
