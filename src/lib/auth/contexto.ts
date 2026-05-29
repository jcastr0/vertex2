import "server-only";
import { headers } from "next/headers";
import { getSesion } from "./cookies";
import { empresaActivaId } from "./empresa";
import type { Contexto } from "@/lib/services/bodegas";

/**
 * Contexto para server actions: sesión + empresa activa (resuelta también para
 * superadmin) + IP. Devuelve null si no hay sesión/empresa válida.
 */
export async function contextoAccion(): Promise<{ ctx: Contexto; rol: string | null } | null> {
  const sesion = await getSesion();
  if (!sesion) return null;
  const empresaId = await empresaActivaId(sesion);
  if (empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { rol: sesion.rol, ctx: { empresaId, usuarioId: sesion.uid, ip } };
}
