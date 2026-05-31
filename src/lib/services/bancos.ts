import "server-only";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bancos } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { slugBanco } from "@/lib/domain/banco";
import type { Contexto } from "./bodegas";
import type { OpcionSelect } from "@/components/ui/search-select";

export type Banco = typeof bancos.$inferSelect;
export const TIPOS_BANCO = ["banco", "billetera", "cooperativa", "financiera"] as const;
export type TipoBanco = (typeof TIPOS_BANCO)[number];

const ETIQUETA_TIPO: Record<string, string> = {
  billetera: "billetera",
  cooperativa: "cooperativa",
  financiera: "financiera",
};

/**
 * Opciones para el selector de banco. El `value` es el nombre canónico — es lo
 * que se guarda en la cuenta (columnas `banco`), evitando typos. El `hint`
 * marca billeteras/cooperativas para distinguirlas de los bancos.
 */
export async function listarBancos(): Promise<OpcionSelect[]> {
  const filas = await db
    .select({ nombre: bancos.nombre, tipo: bancos.tipo })
    .from(bancos)
    .where(eq(bancos.activo, true))
    .orderBy(asc(bancos.orden), asc(bancos.nombre));

  return filas.map((b) => ({
    value: b.nombre,
    label: b.nombre,
    hint: b.tipo ? ETIQUETA_TIPO[b.tipo] : undefined,
  }));
}

/** Catálogo completo (incluye inactivos) para administración. */
export async function listarBancosAdmin(): Promise<Banco[]> {
  return db.select().from(bancos).orderBy(asc(bancos.orden), asc(bancos.nombre));
}

/** Agrega un banco al catálogo global. El código se deriva del nombre (único). */
export async function crearBanco(
  input: { nombre: string; tipo: TipoBanco },
  ctx: Contexto,
): Promise<Banco> {
  const existentes = await db.select({ codigo: bancos.codigo, orden: bancos.orden }).from(bancos);
  const codigo = slugBanco(input.nombre, existentes.map((e) => e.codigo));
  const orden = existentes.reduce((m, e) => Math.max(m, e.orden), 0) + 1; // al final
  const [creado] = await db
    .insert(bancos)
    .values({ codigo, nombre: input.nombre.trim(), tipo: input.tipo, orden })
    .returning();
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx36",
    modelId: creado.id,
    accion: "CREAR",
    registroNuevo: creado,
    ipOrigen: ctx.ip,
  });
  return creado;
}

/** Activa o desactiva un banco del catálogo. */
export async function cambiarEstadoBanco(id: number, activo: boolean, ctx: Contexto): Promise<void> {
  await db.update(bancos).set({ activo, updatedAt: new Date() }).where(eq(bancos.id, id));
  await registrarAuditoria({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    tablaAfectada: "vx36",
    modelId: id,
    accion: "ACTUALIZAR",
    registroNuevo: { activo },
    ipOrigen: ctx.ip,
  });
}
