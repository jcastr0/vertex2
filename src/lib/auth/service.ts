import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuarios, usuariosEmpresas, roles } from "@/lib/db/schema";
import { verifyPassword } from "./password";
import { estaBloqueado, registrarFallo, registrarExito } from "./lockout";
import type { SessionPayload } from "./session";

export type ResultadoLogin =
  | { ok: true; payload: SessionPayload }
  | { ok: false; error: string };

const ERROR_CREDENCIALES = "Credenciales inválidas.";

/**
 * Autentica un usuario por email + contraseña aplicando la política de bloqueo.
 * Actualiza intentos/bloqueo en la base y resuelve el rol según su empresa.
 */
export async function autenticarUsuario(
  email: string,
  password: string,
  ip: string | null,
): Promise<ResultadoLogin> {
  const ahora = new Date();

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email.toLowerCase().trim()))
    .limit(1);

  if (!usuario || !usuario.activo) {
    return { ok: false, error: ERROR_CREDENCIALES };
  }

  if (estaBloqueado({ bloqueadoHasta: usuario.bloqueadoHasta }, ahora)) {
    return {
      ok: false,
      error: `Cuenta bloqueada temporalmente. Intenta de nuevo más tarde.`,
    };
  }

  const valido = await verifyPassword(password, usuario.password);

  if (!valido) {
    const nuevo = registrarFallo({ intentosFallidos: usuario.intentosFallidos }, ahora);
    await db
      .update(usuarios)
      .set({
        intentosFallidos: nuevo.intentosFallidos,
        bloqueadoHasta: nuevo.bloqueadoHasta,
        ultimoIntentoAt: ahora,
        ultimaIp: ip,
      })
      .where(eq(usuarios.id, usuario.id));
    return { ok: false, error: ERROR_CREDENCIALES };
  }

  // Éxito: limpiar bloqueo y registrar login
  const limpio = registrarExito();
  await db
    .update(usuarios)
    .set({
      intentosFallidos: limpio.intentosFallidos,
      bloqueadoHasta: limpio.bloqueadoHasta,
      ultimoLoginAt: ahora,
      ultimaIp: ip,
    })
    .where(eq(usuarios.id, usuario.id));

  // Resolver rol: superadmin tiene rol global; el resto, su rol en la empresa
  let rol: string | null = null;
  if (usuario.esSuperadmin) {
    rol = "SuperAdmin";
  } else if (usuario.empresaId) {
    const [asignacion] = await db
      .select({ nombre: roles.nombre })
      .from(usuariosEmpresas)
      .innerJoin(roles, eq(usuariosEmpresas.rolId, roles.id))
      .where(eq(usuariosEmpresas.usuarioId, usuario.id))
      .limit(1);
    rol = asignacion?.nombre ?? null;
  }

  return {
    ok: true,
    payload: {
      uid: usuario.id,
      empresaId: usuario.empresaId,
      nombre: usuario.nombre,
      email: usuario.email,
      rol,
      esSuperadmin: usuario.esSuperadmin,
    },
  };
}
