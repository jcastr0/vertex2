import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSesion } from "@/lib/auth/cookies";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { empresaActivaId, listarEmpresas } from "@/lib/auth/empresa";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { type AlertaItem } from "@/components/alertas-campana";
import { stockBajo, cxcVencidas, novedadesPorProveedor } from "@/lib/services/reportes";
import { clientesParaRuta } from "@/lib/services/ruta-recaudo";
import { hoyColombia, diaSemanaColombia } from "@/lib/fecha";
import { getPaleta } from "@/lib/temas/paletas";
import { temaCss } from "@/lib/domain/tema";

/** Pendientes de la empresa activa para la campanita (solo lo que el usuario puede ver). */
async function alertasDeEmpresa(empresaId: number, permisos: string[]): Promise<AlertaItem[]> {
  const verInv = puede(permisos, "inventario.ver");
  const verCxc = puede(permisos, "cuentas_cobrar.ver");
  const verRuta = puede(permisos, "ruta_recaudo.ver");
  const hoy = hoyColombia();
  const dia = diaSemanaColombia();
  const [stock, cxc, nov, ruta] = await Promise.all([
    verInv ? stockBajo(empresaId) : Promise.resolve([]),
    verCxc ? cxcVencidas(empresaId, hoy) : Promise.resolve([]),
    verInv ? novedadesPorProveedor(empresaId) : Promise.resolve([]),
    verRuta ? clientesParaRuta(empresaId) : Promise.resolve([]),
  ]);
  const cobrosHoy = ruta.filter((c) => c.diaCobro === dia && c.saldo > 0);
  const totalNov = nov.reduce((a, n) => a + n.novedades, 0);
  const out: AlertaItem[] = [];
  if (stock.length) out.push({ clave: "stock", titulo: "Stock bajo", detalle: `${stock.length} producto${stock.length !== 1 ? "s" : ""} por agotarse`, count: stock.length, href: "/inventario" });
  if (cxc.length) out.push({ clave: "cartera", titulo: "Cartera vencida", detalle: `${cxc.length} cuenta${cxc.length !== 1 ? "s" : ""} vencida${cxc.length !== 1 ? "s" : ""}`, count: cxc.length, href: "/cuentas-cobrar" });
  if (cobrosHoy.length) out.push({ clave: "cobros", titulo: "Cobros de hoy", detalle: `${cobrosHoy.length} cliente${cobrosHoy.length !== 1 ? "s" : ""} en la ruta de hoy`, count: cobrosHoy.length, href: "/ruta-recaudo" });
  if (totalNov) out.push({ clave: "novedades", titulo: "Novedades de proveedor", detalle: `${totalNov} novedad${totalNov !== 1 ? "es" : ""} por revisar`, count: totalNov, href: "/reportes" });
  return out;
}

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

  const alertas = empresaIdActiva ? await alertasDeEmpresa(empresaIdActiva, permisos) : [];

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
          alertas={alertas}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
