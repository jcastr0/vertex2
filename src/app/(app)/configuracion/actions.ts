"use server";
import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { guardarConfig, guardarSecreto } from "@/lib/services/configuracion";

export interface ConfigState {
  ok?: boolean;
  error?: string;
}

export async function guardarConfigBotAction(_prev: ConfigState, form: FormData): Promise<ConfigState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "configuracion.editar")) return { error: "No tienes permiso." };
  const activo = String(form.get("botActivo") || "") === "1";
  const mensaje = String(form.get("mensajeNoRegistrado") || "").trim();
  const apiKey = String(form.get("apiKeyClaude") || "").trim();
  try {
    await guardarConfig("bot.activo", activo, c.ctx.empresaId, c.ctx);
    if (mensaje) await guardarConfig("bot.mensajeNoRegistrado", mensaje, c.ctx.empresaId, c.ctx);
    if (apiKey) await guardarSecreto("anthropic.apiKey", apiKey, c.ctx.empresaId, c.ctx);
  } catch (e) {
    console.error("[config] error:", e);
    return { error: "No se pudo guardar." };
  }
  revalidatePath("/configuracion");
  revalidatePath("/cotizaciones/asistente");
  return { ok: true };
}
