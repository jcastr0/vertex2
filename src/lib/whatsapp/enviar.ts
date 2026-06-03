import "server-only";
import { whatsappToken, whatsappPhoneNumberId } from "@/lib/services/configuracion";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Envía un texto por WhatsApp (Meta Cloud API). Aislado a propósito: si mañana
 * se usa un intermediario (Twilio/360dialog), solo cambia esta función.
 * Usa las credenciales de la empresa (config + token cifrado). No lanza.
 */
export async function enviarTexto(empresaId: number, to: string, texto: string): Promise<boolean> {
  const [token, phoneNumberId] = await Promise.all([whatsappToken(empresaId), whatsappPhoneNumberId(empresaId)]);
  if (!token || !phoneNumberId) {
    console.error("[whatsapp] empresa", empresaId, "sin token/phoneNumberId configurados");
    return false;
  }
  try {
    const r = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: texto } }),
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
