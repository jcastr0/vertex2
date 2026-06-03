import { describe, it, expect } from "vitest";
import { normalizarTelefono, esAfirmacion, parsearMensajeEntrante } from "./whatsapp";

describe("normalizarTelefono", () => {
  it("deja los últimos 10 dígitos (ignora prefijo país y separadores)", () => {
    expect(normalizarTelefono("+57 316 280 0128")).toBe("3162800128");
    expect(normalizarTelefono("573162800128")).toBe("3162800128");
    expect(normalizarTelefono("3162800128")).toBe("3162800128");
    expect(normalizarTelefono("(316) 280-0128")).toBe("3162800128");
  });
  it("deja vacío si no hay dígitos", () => {
    expect(normalizarTelefono("sin numero")).toBe("");
  });
});

describe("esAfirmacion", () => {
  it("reconoce confirmaciones comunes", () => {
    for (const s of ["sí", "si", "dale", "listo", "confirmo", "ok", "de una", "hágale", "así está bien"]) {
      expect(esAfirmacion(s)).toBe(true);
    }
  });
  it("no confunde negativas u otros pedidos", () => {
    expect(esAfirmacion("no")).toBe(false);
    expect(esAfirmacion("mejor agrega 2 de papa")).toBe(false);
  });
});

describe("parsearMensajeEntrante", () => {
  const base = (msg: object) => ({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "PN1" }, messages: [msg] } }] }] });
  it("parsea un mensaje de texto", () => {
    const r = parsearMensajeEntrante(base({ from: "573162800128", type: "text", text: { body: "hola" } }));
    expect(r).toEqual({ phoneNumberId: "PN1", from: "573162800128", texto: "hola", imagenMediaId: undefined });
  });
  it("parsea un mensaje de imagen", () => {
    const r = parsearMensajeEntrante(base({ from: "573162800128", type: "image", image: { id: "MEDIA1" } }));
    expect(r?.imagenMediaId).toBe("MEDIA1");
  });
  it("devuelve null si no hay mensaje (p. ej. status update o basura)", () => {
    expect(parsearMensajeEntrante({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toBeNull();
    expect(parsearMensajeEntrante({})).toBeNull();
    expect(parsearMensajeEntrante(null)).toBeNull();
  });
});
