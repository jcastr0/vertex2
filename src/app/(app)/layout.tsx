import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSesion } from "@/lib/auth/cookies";
import { getPermisos } from "@/lib/auth/permisos";
import { empresaActivaId, listarEmpresas } from "@/lib/auth/empresa";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getPaleta } from "@/lib/temas/paletas";
import { temaCss } from "@/lib/domain/tema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");

  const permisos = await getPermisos();
  const empresaIdActiva = await empresaActivaId(sesion);

  let empresaNombre: string | null = null;
  let paletaKey: string | null = null;
  if (empresaIdActiva) {
    try {
      const [e] = await db
        .select({ nombre: empresas.nombre, paletaTema: empresas.paletaTema })
        .from(empresas)
        .where(eq(empresas.id, empresaIdActiva))
        .limit(1);
      empresaNombre = e?.nombre ?? null;
      paletaKey = e?.paletaTema ?? null;
    } catch {
      empresaNombre = null;
    }
  }
  const css = temaCss(getPaleta(paletaKey));

  // El superadmin puede cambiar de empresa.
  const listaEmpresas = sesion.esSuperadmin
    ? (await listarEmpresas()).map((e) => ({ id: e.id, nombre: e.nombre }))
    : [];

  return (
    <div className="flex h-svh overflow-hidden">
      {css && <style id="tema-empresa" dangerouslySetInnerHTML={{ __html: css }} />}
      <AppSidebar permisos={permisos} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          nombre={sesion.nombre}
          email={sesion.email}
          rol={sesion.rol}
          permisos={permisos}
          empresa={empresaNombre}
          empresas={listaEmpresas}
          empresaActivaId={empresaIdActiva}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
