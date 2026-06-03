/** Lógica pura del canal de WhatsApp (sin red ni BD). Con prueba de escritorio. */

/** Normaliza un teléfono a sus últimos 10 dígitos (ignora prefijo país y separadores).
 *  En Colombia los celulares son 10 dígitos; así "+57 316 280 0128" y "3162800128" coinciden. */
export function normalizarTelefono(n: string): string {
  const d = (n || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

// Palabras de afirmación (para frases donde TODAS las palabras son afirmativas, ej. "si dale").
const AFIRMACIONES = [
  "si", "dale", "listo", "confirmo", "confirmar", "confirma", "confirmado", "ok", "oka", "okay",
  "vale", "correcto", "eso", "hagale", "perfecto", "claro", "asi", "ya", "bien", "obvio", "exacto", "sip", "sii",
  // frases completas (se comparan exactas)
  "de una", "de acuerdo", "eso es", "esta bien", "asi esta bien", "esta perfecto", "asi esta",
];
// Palabras de confirmación fuertes: si aparece alguna (y no hay negación), es afirmación
// aunque la frase tenga relleno ("confirmo el pedido", "listo gracias", "si por favor").
const FUERTES = new Set(["si", "dale", "listo", "confirmo", "confirmar", "confirma", "confirmado", "ok", "oka", "okay", "correcto", "perfecto", "hagale", "exacto", "obvio", "sip", "sii"]);
// Señales de que NO es una confirmación simple sino un ajuste/negación → no cerramos el pedido.
const NEGACIONES = new Set(["no", "mejor", "cambia", "cambiar", "cambio", "quita", "quitar", "quitale", "agrega", "agregar", "agregale", "anade", "espera", "cancela", "cancelar", "pero", "aun", "todavia", "falta", "faltan", "sin"]);

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** ¿El texto es una confirmación afirmativa? (sin tildes, comparación laxa, veta ajustes). */
export function esAfirmacion(texto: string): boolean {
  const t = sinTildes(texto || "").toLowerCase().trim().replace(/[!.¡,?¿]/g, "");
  if (!t) return false;
  const palabras = t.split(/\s+/);
  if (palabras.some((w) => NEGACIONES.has(w))) return false; // "si pero quita...", "no", "mejor..."
  const set = new Set(AFIRMACIONES.map(sinTildes));
  if (set.has(t) || palabras.every((w) => set.has(w))) return true; // frase 100% afirmativa
  return palabras.some((w) => FUERTES.has(w)); // contiene una confirmación fuerte ("confirmo el pedido")
}

export interface MensajeEntrante {
  phoneNumberId: string;
  from: string;
  texto?: string;
  imagenMediaId?: string;
  /** id del botón pulsado (mensaje interactivo), p. ej. "confirmar" / "cancelar". */
  botonId?: string;
}

interface MsgMeta {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string };
  interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
}

/** Extrae el primer mensaje útil del payload del webhook de Meta. null si no hay (status, basura). */
export function parsearMensajeEntrante(payload: unknown): MensajeEntrante | null {
  try {
    const value = (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })
      ?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = (value?.metadata as { phone_number_id?: string } | undefined)?.phone_number_id;
    const msg = (value?.messages as MsgMeta[] | undefined)?.[0];
    if (!phoneNumberId || !msg?.from) return null;
    // Respuesta de botón/lista interactiva: el id viaja en interactive.*_reply.
    if (msg.type === "interactive") {
      const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
      return { phoneNumberId, from: msg.from, botonId: reply?.id, texto: reply?.title };
    }
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
