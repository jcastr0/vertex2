/** Lógica pura del canal de WhatsApp (sin red ni BD). Con prueba de escritorio. */

/** Normaliza un teléfono a sus últimos 10 dígitos (ignora prefijo país y separadores).
 *  En Colombia los celulares son 10 dígitos; así "+57 316 280 0128" y "3162800128" coinciden. */
export function normalizarTelefono(n: string): string {
  const d = (n || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

const AFIRMACIONES = [
  "si", "sí", "dale", "listo", "confirmo", "confirmar", "confirma", "ok", "oka", "okay",
  "vale", "correcto", "eso es", "eso", "hagale", "hágale", "de una", "perfecto", "claro",
  "asi esta bien", "así está bien", "asi", "así", "de acuerdo", "ya",
];
/** ¿El texto es una confirmación afirmativa? (sin tildes, comparación laxa). */
export function esAfirmacion(texto: string): boolean {
  const t = (texto || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().trim().replace(/[!.¡,]/g, "");
  if (!t) return false;
  const set = new Set(AFIRMACIONES.map((a) => a.normalize("NFD").replace(/\p{Diacritic}/gu, "")));
  return set.has(t) || t.split(/\s+/).every((w) => set.has(w));
}

export interface MensajeEntrante {
  phoneNumberId: string;
  from: string;
  texto?: string;
  imagenMediaId?: string;
}

/** Extrae el primer mensaje útil del payload del webhook de Meta. null si no hay (status, basura). */
export function parsearMensajeEntrante(payload: unknown): MensajeEntrante | null {
  try {
    const value = (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })
      ?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = (value?.metadata as { phone_number_id?: string } | undefined)?.phone_number_id;
    const msg = (value?.messages as { from?: string; type?: string; text?: { body?: string }; image?: { id?: string } }[] | undefined)?.[0];
    if (!phoneNumberId || !msg?.from) return null;
    return {
      phoneNumberId,
      from: msg.from,
      texto: msg.type === "text" ? msg.text?.body : undefined,
      imagenMediaId: msg.type === "image" ? msg.image?.id : undefined,
    };
  } catch {
    return null;
  }
}
