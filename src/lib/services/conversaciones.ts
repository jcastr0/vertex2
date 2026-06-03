import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversacionesBot } from "@/lib/db/schema";
import type { MensajeChat } from "@/lib/bot/cliente-claude";

/** Línea del pedido en curso, ya resuelta contra el catálogo (lista para crear la cotización). */
export interface LineaGuardada {
  productoId: number;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}
export interface Conversacion {
  lineas: LineaGuardada[];
  historial: MensajeChat[];
  estado: string;
}

/** Forma nueva del jsonb `borrador`: líneas + historial del chat. (Antes era solo el array de líneas.) */
interface BorradorGuardado {
  lineas: LineaGuardada[];
  historial: MensajeChat[];
}

function leerBorrador(raw: unknown): { lineas: LineaGuardada[]; historial: MensajeChat[] } {
  if (Array.isArray(raw)) return { lineas: raw as LineaGuardada[], historial: [] }; // formato viejo
  const b = (raw ?? {}) as Partial<BorradorGuardado>;
  return { lineas: b.lineas ?? [], historial: b.historial ?? [] };
}

/** Estado de la conversación del bot con un teléfono (borrador del pedido + historial). */
export async function cargarConversacion(empresaId: number, telefono: string): Promise<Conversacion | null> {
  const [c] = await db
    .select()
    .from(conversacionesBot)
    .where(and(eq(conversacionesBot.empresaId, empresaId), eq(conversacionesBot.telefono, telefono)))
    .limit(1);
  if (!c) return null;
  const { lineas, historial } = leerBorrador(c.borrador);
  return { lineas, historial, estado: c.estado };
}

export async function guardarConversacion(empresaId: number, telefono: string, lineas: LineaGuardada[], historial: MensajeChat[], estado: string): Promise<void> {
  const borrador: BorradorGuardado = { lineas, historial };
  const [existente] = await db
    .select({ id: conversacionesBot.id })
    .from(conversacionesBot)
    .where(and(eq(conversacionesBot.empresaId, empresaId), eq(conversacionesBot.telefono, telefono)))
    .limit(1);
  if (existente) {
    await db.update(conversacionesBot).set({ borrador, estado, updatedAt: new Date() }).where(eq(conversacionesBot.id, existente.id));
  } else {
    await db.insert(conversacionesBot).values({ empresaId, telefono, borrador, estado });
  }
}

export async function limpiarConversacion(empresaId: number, telefono: string): Promise<void> {
  await db.delete(conversacionesBot).where(and(eq(conversacionesBot.empresaId, empresaId), eq(conversacionesBot.telefono, telefono)));
}
