import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

const RUTAS_PUBLICAS = ["/login"];

/**
 * Protege todas las rutas de la app. Verifica el JWT de sesión (jose corre en
 * el runtime Edge). Sin sesión válida → redirige a /login; con sesión en una
 * ruta pública → redirige a /dashboard.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const sesion = await verifySession(token);

  const esPublica = RUTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  if (!sesion && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (sesion && esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Excluye estáticos, imágenes y assets; protege el resto
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
