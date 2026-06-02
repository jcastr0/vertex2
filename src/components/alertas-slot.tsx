import { puede } from "@/lib/auth/roles";
import { stockBajo, cxcVencidas, novedadesPorProveedor } from "@/lib/services/reportes";
import { clientesParaRuta } from "@/lib/services/ruta-recaudo";
import { hoyColombia, diaSemanaColombia } from "@/lib/fecha";
import { AlertasCampana, type AlertaItem } from "@/components/alertas-campana";

/** Pendientes de la empresa activa (solo lo que el usuario puede ver). */
async function cargarAlertas(empresaId: number, permisos: string[]): Promise<AlertaItem[]> {
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

/**
 * Carga las alertas de la empresa activa y las pinta en la campanita. Se monta
 * dentro de un <Suspense> en el layout, de modo que NO bloquea ni compite en el
 * camino crítico de cada página: el shell pinta de inmediato y la campanita
 * llega cuando sus consultas terminan.
 */
export async function AlertasSlot({ empresaId, permisos }: { empresaId: number; permisos: string[] }) {
  const items = await cargarAlertas(empresaId, permisos);
  return <AlertasCampana items={items} />;
}
