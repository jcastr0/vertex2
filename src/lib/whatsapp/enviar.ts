import "server-only";
import { whatsappToken, whatsappPhoneNumberId } from "@/lib/services/configuracion";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Envía un texto por WhatsApp (Meta Cloud API). Aislado a propósito: si mañana
 * se usa un intermediario (Twilio/360dialog), solo cambia esta función.
 * Usa las credenciales de la empresa (config + token cifrado). No lanza.
 */
async function enviar(empresaId: number, payload: Record<string, unknown>): Promise<boolean> {
  const [token, phoneNumberId] = await Promise.all([whatsappToken(empresaId), whatsappPhoneNumberId(empresaId)]);
  if (!token || !phoneNumberId) {
    console.error("[whatsapp] empresa", empresaId, "sin token/phoneNumberId configurados");
    return false;
  }
  try {
    const r = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    if (!r.ok) {
      console.error("[whatsapp] error al enviar:", r.status, await r.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[whatsapp] excepción al enviar:", (e as Error).message);
    return false;
  }
}

export function enviarTexto(empresaId: number, to: string, texto: string): Promise<boolean> {
  return enviar(empresaId, { to, type: "text", text: { body: texto } });
}

export interface Boton {
  /** id que vuelve en el webhook al pulsarlo (máx 256), p. ej. "confirmar". */
  id: string;
  /** texto visible del botón (máx 20 caracteres). */
  title: string;
}

/**
 * Envía un mensaje con botones de respuesta (máx 3). El cliente toca uno y Meta
 * devuelve su `id` en el webhook. Si el envío con botones falla, el llamador
 * puede caer a `enviarTexto` (no todos los números/estados soportan interactivos).
 */
export function enviarBotones(empresaId: number, to: string, cuerpo: string, botones: Boton[]): Promise<boolean> {
  return enviar(empresaId, {
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: cuerpo.slice(0, 1024) },
      action: { buttons: botones.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    },
  });
}
