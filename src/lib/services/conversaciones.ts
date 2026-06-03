import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversacionesBot } from "@/lib/db/schema";

export interface BorradorLinea {
  nombre: string;
  cantidad: number;
}
export interface Conversacion {
  borrador: BorradorLinea[];
  estado: string;
}

/** Estado de la conversación del bot con un teléfono (borrador del pedido). */
export async function cargarConversacion(empresaId: number, telefono: string): Promise<Conversacion | null> {
  const [c] = await db
    .select()
    .from(conversacionesBot)
    .where(and(eq(conversacionesBot.empresaId, empresaId), eq(conversacionesBot.telefono, telefono)))
    .limit(1);
  if (!c) return null;
  return { borrador: (c.borrador as BorradorLinea[] | null) ?? [], estado: c.estado };
}

export async function guardarConversacion(empresaId: number, telefono: string, borrador: BorradorLinea[], estado: string): Promise<void> {
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
