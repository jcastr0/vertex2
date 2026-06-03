import "server-only";
import { salidaPedidoSchema, type SalidaPedido } from "./schema";

export interface ImagenEntrada {
  /** data URL (p. ej. "data:image/jpeg;base64,...") o URL http(s). */
  dataUrl: string;
}

/** Un turno previo del chat, para darle contexto a Claude (entiende "5", "el mismo"…). */
export interface MensajeChat {
  rol: "user" | "assistant";
  texto: string;
}

/**
 * Pide a Claude (Haiku 4.5, con visión) que estructure el pedido. Recibe el
 * `historial` del chat para resolver respuestas en contexto (p. ej. "5" tras
 * "¿cuántos kg?"). Si recibe `apiKey` (de Configuración, descifrada) la usa; si
 * no, el SDK toma ANTHROPIC_API_KEY de env. Devuelve la salida validada por Zod.
 */
export async function pedirPedido(prompt: string, imagenes: ImagenEntrada[], apiKey?: string, historial: MensajeChat[] = []): Promise<SalidaPedido> {
  // Carga diferida: el SDK de IA (ESM) NO se evalúa en build, solo al llamar a Claude en runtime.
  const { generateObject } = await import("ai");
  const { anthropic, createAnthropic } = await import("@ai-sdk/anthropic");
  const provider = apiKey ? createAnthropic({ apiKey }) : anthropic;

  const content: ({ type: "text"; text: string } | { type: "image"; image: string })[] = [{ type: "text", text: prompt }];
  for (const img of imagenes) content.push({ type: "image", image: img.dataUrl });

  const previos = historial.map((m) => ({ role: m.rol, content: m.texto }));

  const { object } = await generateObject({
    model: provider("claude-haiku-4-5"),
    schema: salidaPedidoSchema,
    messages: [...previos, { role: "user", content }],
  });
  return object;
}
