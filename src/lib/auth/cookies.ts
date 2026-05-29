import "server-only";
import { cookies } from "next/headers";
import { signSession, verifySession, SESSION_COOKIE, type SessionPayload } from "./session";

const OCHO_HORAS = 60 * 60 * 8;

/** Crea la cookie de sesión httpOnly con el JWT firmado. */
export async function crearSesion(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OCHO_HORAS,
  });
}

/** Elimina la cookie de sesión (logout). */
export async function destruirSesion(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Devuelve la sesión actual a partir de la cookie, o null. */
export async function getSesion(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
