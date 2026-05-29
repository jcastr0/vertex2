"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { autenticarUsuario } from "@/lib/auth/service";
import { crearSesion } from "@/lib/auth/cookies";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const res = await autenticarUsuario(parsed.data.email, parsed.data.password, ip);
  if (!res.ok) {
    return { error: res.error };
  }

  await crearSesion(res.payload);
  await registrarAuditoria({
    empresaId: res.payload.empresaId,
    usuarioId: res.payload.uid,
    tablaAfectada: "vx02_usuarios",
    modelId: res.payload.uid,
    accion: "ACTUALIZAR",
    registroNuevo: { evento: "login" },
    ipOrigen: ip,
  });

  redirect("/dashboard");
}
