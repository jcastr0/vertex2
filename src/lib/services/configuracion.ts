import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { configuracion } from "@/lib/db/schema";
import { resolverConfig } from "@/lib/domain/configuracion";
import { cifrar, descifrar } from "@/lib/domain/crypto";
import { registrarAuditoria } from "@/lib/audit";
import type { Contexto } from "./bodegas";

interface ValorSecreto { __secreto: true; cifrado: string }
function esSecreto(v: unknown): v is ValorSecreto {
  return !!v && typeof v === "object" && (v as ValorSecreto).__secreto === true;
}

async function leer(clave: string, empresaId: number): Promise<{ emp?: unknown; glob?: unknown }> {
  const rows = await db
    .select({ empresaId: configuracion.empresaId, valor: configuracion.valor })
    .from(configuracion)
    .where(eq(configuracion.clave, clave));
  let emp: unknown, glob: unknown;
  for (const r of rows) {
    if (r.empresaId === empresaId) emp = r.valor ?? undefined;
    else if (r.empresaId === null) glob = r.valor ?? undefined;
  }
  return { emp, glob };
}

/** Valor de la clave para la empresa (empresa → global → default). */
export async function obtenerConfig<T>(clave: string, empresaId: number, porDefecto: T): Promise<T> {
  const { emp, glob } = await leer(clave, empresaId);
  return resolverConfig(emp as T | undefined, glob as T | undefined, porDefecto);
}

/** Upsert del valor para la empresa (auditado). */
export async function guardarConfig(clave: string, valor: unknown, empresaId: number, ctx: Contexto): Promise<void> {
  const [existente] = await db
    .select({ id: configuracion.id })
    .from(configuracion)
    .where(and(eq(configuracion.clave, clave), eq(configuracion.empresaId, empresaId)))
    .limit(1);
  if (existente) {
    await db.update(configuracion).set({ valor, updatedAt: new Date() }).where(eq(configuracion.id, existente.id));
  } else {
    await db.insert(configuracion).values({ empresaId, clave, valor });
  }
  await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx41", accion: "ACTUALIZAR", registroNuevo: { clave, valor }, ipOrigen: ctx.ip });
}

// ── Secretos (cifrados en reposo) ───────────────────────────────────────────

/** Guarda un secreto cifrado (AES-256-GCM). El valor en claro nunca se audita. */
export async function guardarSecreto(clave: string, valorPlano: string, empresaId: number, ctx: Contexto): Promise<void> {
  const valor: ValorSecreto = { __secreto: true, cifrado: cifrar(valorPlano) };
  const [existente] = await db
    .select({ id: configuracion.id })
    .from(configuracion)
    .where(and(eq(configuracion.clave, clave), eq(configuracion.empresaId, empresaId)))
    .limit(1);
  if (existente) {
    await db.update(configuracion).set({ valor, updatedAt: new Date() }).where(eq(configuracion.id, existente.id));
  } else {
    await db.insert(configuracion).values({ empresaId, clave, valor });
  }
  await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx41", accion: "ACTUALIZAR", registroNuevo: { clave, secreto: true }, ipOrigen: ctx.ip });
}

/** Lee y descifra un secreto. Devuelve null si no existe o si no se puede descifrar
 *  (p. ej. CONFIG_SECRET distinto/ausente) — así el llamador cae a su fallback sin romperse. */
export async function obtenerSecreto(clave: string, empresaId: number): Promise<string | null> {
  const { emp, glob } = await leer(clave, empresaId);
  const v = emp ?? glob;
  if (!esSecreto(v)) return null;
  try {
    return descifrar(v.cifrado);
  } catch (e) {
    console.error(`[config] no se pudo descifrar el secreto "${clave}":`, (e as Error).message);
    return null;
  }
}

/** ¿Hay un secreto guardado para esa clave? (sin revelar el valor). */
export async function secretoConfigurado(clave: string, empresaId: number): Promise<boolean> {
  const { emp, glob } = await leer(clave, empresaId);
  return esSecreto(emp ?? glob);
}

export const MENSAJE_NO_REGISTRADO_DEFAULT =
  "Para tomar tu pedido primero debemos registrarte. Al ser tu primera compra, hacemos un proceso de registro de 24 horas; recibirás una confirmación cuando sea autorizado. ¡Gracias!";

export function botActivo(empresaId: number): Promise<boolean> {
  return obtenerConfig<boolean>("bot.activo", empresaId, false);
}

// ── WhatsApp (credenciales configurables desde la UI) ────────────────────────

/** Empresa cuyo número de WhatsApp (phone_number_id) coincide con el entrante. */
export async function empresaPorPhoneNumberId(phoneNumberId: string): Promise<number | null> {
  const objetivo = String(phoneNumberId).trim();
  const rows = await db
    .select({ empresaId: configuracion.empresaId, valor: configuracion.valor })
    .from(configuracion)
    .where(eq(configuracion.clave, "whatsapp.phoneNumberId"));
  console.log("[wa] resolver empresa para", JSON.stringify(objetivo), "candidatos:", JSON.stringify(rows.map((r) => ({ empresaId: r.empresaId, valor: r.valor, tipo: typeof r.valor }))));
  // Comparación robusta: el valor en jsonb puede venir como número o con
  // espacios; normalizamos ambos lados a texto sin espacios.
  const r = rows.find((x) => x.empresaId !== null && String(x.valor ?? "").trim() === objetivo);
  return r?.empresaId ?? null;
}
/** Access token de WhatsApp de la empresa (secreto cifrado). */
export function whatsappToken(empresaId: number): Promise<string | null> {
  return obtenerSecreto("whatsapp.token", empresaId);
}
/** Phone Number ID de WhatsApp de la empresa. */
export function whatsappPhoneNumberId(empresaId: number): Promise<string | null> {
  return obtenerConfig<string | null>("whatsapp.phoneNumberId", empresaId, null);
}
export function mensajeNoRegistrado(empresaId: number): Promise<string> {
  return obtenerConfig<string>("bot.mensajeNoRegistrado", empresaId, MENSAJE_NO_REGISTRADO_DEFAULT);
}
