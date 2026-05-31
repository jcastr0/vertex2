// src/app/(app)/tesoreria/cierre/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { registrarCierre, CierreInvalido } from "@/lib/services/cierre";

export interface CierreState { error?: string }
export async function registrarCierreAction(_prev: CierreState, form: FormData): Promise<CierreState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "tesoreria.crear")) return { error: "No tienes permiso." };
  const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
  const observaciones = String(form.get("observaciones") || "") || null;
  let conteos: { cuentaId: number; montoContado?: number }[] = [];
  try { conteos = JSON.parse(String(form.get("conteosJson") ?? "[]")); } catch { /* ignore */ }
  let id: number;
  try { id = await registrarCierre(c.ctx.empresaId, fecha, conteos, observaciones, c.ctx); }
  catch (e) { if (e instanceof CierreInvalido) return { error: e.message }; console.error("[cierre]", e); return { error: "No se pudo registrar el cierre." }; }
  revalidatePath("/tesoreria/cierre");
  redirect(`/tesoreria/cierre?ok=${id}`);
}
