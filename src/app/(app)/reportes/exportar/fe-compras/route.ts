import { requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { comprasElectronicasCsv } from "@/lib/services/export-fe";
import { csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const { sesion, empresaId } = await requireEmpresa();
  if (!puede(sesion.rol, "reportes.ver")) return new Response("No autorizado", { status: 403 });
  const url = new URL(req.url);
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = url.searchParams.get("desde") || hoy.slice(0, 8) + "01";
  const hasta = url.searchParams.get("hasta") || hoy;
  const csv = await comprasElectronicasCsv(empresaId, desde, hasta);
  return csvResponse(`fe-compras-retenciones_${desde}_a_${hasta}.csv`, csv);
}
