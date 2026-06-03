import { describe, it, expect } from "vitest";
import { normalizarTelefono, esAfirmacion, parsearMensajeEntrante, sanearHistorial } from "./whatsapp";

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
  it("reconoce confirmaciones con relleno (palabra fuerte + otras palabras)", () => {
    expect(esAfirmacion("Confirmo el pedido")).toBe(true);
    expect(esAfirmacion("si por favor")).toBe(true);
    expect(esAfirmacion("listo gracias")).toBe(true);
    expect(esAfirmacion("dale pues")).toBe(true);
  });
  it("no confunde negativas u otros pedidos", () => {
    expect(esAfirmacion("no")).toBe(false);
    expect(esAfirmacion("mejor agrega 2 de papa")).toBe(false);
  });
  it("veta cuando hay señal de ajuste aunque empiece con 'sí'", () => {
    expect(esAfirmacion("sí pero quítale el tomate")).toBe(false);
    expect(esAfirmacion("si cambia a 2 kg")).toBe(false);
    expect(esAfirmacion("no, mejor mañana")).toBe(false);
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
  it("parsea la respuesta de un botón interactivo (id + título)", () => {
    const r = parsearMensajeEntrante(base({ from: "573162800128", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "confirmar", title: "✅ Confirmar" } } }));
    expect(r?.botonId).toBe("confirmar");
    expect(r?.texto).toBe("✅ Confirmar");
  });
  it("devuelve null si no hay mensaje (p. ej. status update o basura)", () => {
    expect(parsearMensajeEntrante({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toBeNull();
    expect(parsearMensajeEntrante({})).toBeNull();
    expect(parsearMensajeEntrante(null)).toBeNull();
  });
});

describe("sanearHistorial", () => {
  const u = (texto: string) => ({ rol: "user" as const, texto });
  const a = (texto: string) => ({ rol: "assistant" as const, texto });

  it("deja un historial bien formado intacto (termina en assistant)", () => {
    const h = [u("hola"), a("¿qué necesitas?"), u("2 kg papa"), a("¿algo más?")];
    expect(sanearHistorial(h)).toEqual(h);
  });
  it("descarta mensajes 'assistant' al inicio (recorte que dejó empezando mal)", () => {
    const r = sanearHistorial([a("¿algo más?"), u("5"), a("¿confirmo?")]);
    expect(r[0].rol).toBe("user");
  });
  it("colapsa roles repetidos consecutivos (debe alternar)", () => {
    const r = sanearHistorial([u("hola"), u("2 kg papa"), a("ok"), a("¿algo más?")]);
    expect(r.map((m) => m.rol)).toEqual(["user", "assistant"]);
  });
  it("quita el último 'user' para dejar espacio al mensaje actual", () => {
    const r = sanearHistorial([u("hola"), a("dime"), u("otra cosa")]);
    expect(r[r.length - 1].rol).toBe("assistant");
  });
  it("ignora mensajes vacíos", () => {
    const r = sanearHistorial([u(""), u("hola"), a("dime")]);
    expect(r).toEqual([u("hola"), a("dime")]);
  });
});
