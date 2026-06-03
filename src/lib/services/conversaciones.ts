import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversacionesBot } from "@/lib/db/schema";

/** Línea del pedido en curso, ya resuelta contra el catálogo (lista para crear la cotización). */
export interface LineaGuardada {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}
export interface Conversacion {
  lineas: LineaGuardada[];
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
  return { lineas: (c.borrador as LineaGuardada[] | null) ?? [], estado: c.estado };
}

export async function guardarConversacion(empresaId: number, telefono: string, lineas: LineaGuardada[], estado: string): Promise<void> {
  const [existente] = await db
    .select({ id: conversacionesBot.id })
    .from(conversacionesBot)
    .where(and(eq(conversacionesBot.empresaId, empresaId), eq(conversacionesBot.telefono, telefono)))
    .limit(1);
  if (existente) {
    await db.update(conversacionesBot).set({ borrador: lineas, estado, updatedAt: new Date() }).where(eq(conversacionesBot.id, existente.id));
  } else {
    await db.insert(conversacionesBot).values({ empresaId, telefono, borrador: lineas, estado });
  }
}

export async function limpiarConversacion(empresaId: number, telefono: string): Promise<void> {
  await db.delete(conversacionesBot).where(and(eq(conversacionesBot.empresaId, empresaId), eq(conversacionesBot.telefono, telefono)));
}
