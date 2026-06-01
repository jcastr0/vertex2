import { requireEmpresa } from "@/lib/auth/guard";
import { hoyColombia } from "@/lib/fecha";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { ventasElectronicasCsv } from "@/lib/services/export-fe";
import { csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  if (!puede(permisos, "reportes.ver")) return new Response("No autorizado", { status: 403 });
  const url = new URL(req.url);
  const hoy = hoyColombia();
  const desde = url.searchParams.get("desde") || hoy.slice(0, 8) + "01";
  const hasta = url.searchParams.get("hasta") || hoy;
  const csv = await ventasElectronicasCsv(empresaId, desde, hasta);
  return csvResponse(`fe-ventas_${desde}_a_${hasta}.csv`, csv);
}
