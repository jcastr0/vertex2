import "server-only";
import { redirect } from "next/navigation";
import { getSesion } from "./cookies";
import { puede, type Permiso } from "./roles";
import type { SessionPayload } from "./session";

/** Exige sesión válida; redirige a /login si no hay. Para Server Components. */
export async function requireSesion(): Promise<SessionPayload> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/** Exige sesión + permiso; redirige a /login o /dashboard. Para Server Components. */
export async function requirePermiso(permiso: Permiso): Promise<SessionPayload> {
  const sesion = await requireSesion();
  if (!puede(sesion.rol, permiso)) redirect("/dashboard");
  return sesion;
}

/**
 * Resuelve la empresa activa de la sesión. Toda consulta de datos se filtra por
 * este id. Lanza si la sesión no tiene empresa (p. ej. superadmin sin contexto).
 */
export async function requireEmpresa(): Promise<{ sesion: SessionPayload; empresaId: number }> {
  const sesion = await requireSesion();
  if (sesion.empresaId == null) {
    redirect("/dashboard");
  }
  return { sesion, empresaId: sesion.empresaId };
}
