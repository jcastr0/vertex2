import { SignJWT, jwtVerify } from "jose";

/**
 * Sesión de Vertex codificada como JWT firmado (HS256) y guardada en una cookie
 * httpOnly. Auth custom: no se usa Supabase Auth. Compatible con el runtime Edge
 * (jose es WebCrypto puro), por lo que puede verificarse en el middleware.
 */
export interface SessionPayload {
  uid: number;
  empresaId: number | null;
  nombre: string;
  email: string;
  rol: string | null;
  esSuperadmin: boolean;
}

export const SESSION_COOKIE = "vx_session";
const DURACION = "8h";

function getSecret(): Uint8Array {
  // Preferimos un SESSION_SECRET dedicado. Como fallback de arranque usamos el
  // secreto JWT que el integration de Supabase ya inyecta en Vercel, de modo que
  // el deploy funcione sin configuración manual. Define SESSION_SECRET propio
  // para producción (si rotas las llaves de Supabase, el fallback invalida sesiones).
  const secret = process.env.SESSION_SECRET || process.env.STORAGE_VERTEX_SUPABASE_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "No hay secreto de sesión. Define SESSION_SECRET (mínimo 32 caracteres).",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Firma un payload de sesión y devuelve el JWT. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACION)
    .sign(getSecret());
}

/** Verifica un JWT de sesión. Devuelve el payload o null si es inválido/expirado. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      uid: payload.uid as number,
      empresaId: (payload.empresaId as number | null) ?? null,
      nombre: payload.nombre as string,
      email: payload.email as string,
      rol: (payload.rol as string | null) ?? null,
      esSuperadmin: Boolean(payload.esSuperadmin),
    };
  } catch {
    return null;
  }
}
