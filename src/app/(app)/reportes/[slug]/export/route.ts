import { requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { getReporte, filtrosConDefaults } from "@/lib/reportes/registry";
import { toCsv, csvResponse } from "@/lib/csv";
import { construirXlsx, xlsxResponse } from "@/lib/xlsx";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { sesion, empresaId } = await requireEmpresa();
  if (!puede(sesion.rol, "reportes.ver")) return new Response("No autorizado", { status: 403 });
  const { slug } = await params;
  const rep = getReporte(slug);
  if (!rep) return new Response("Reporte no encontrado", { status: 404 });

  const url = new URL(req.url);
  const hoy = new Date().toISOString().slice(0, 10);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filtros = filtrosConDefaults(sp, hoy);
  const { detalle } = await rep.cargar(empresaId, filtros);
  const fmt = url.searchParams.get("fmt") === "xlsx" ? "xlsx" : "csv";
  const nombre = `${rep.slug}_${filtros.desde}_a_${filtros.hasta}`;
  const filtrosTexto = `Periodo ${filtros.desde} a ${filtros.hasta}`;

  if (fmt === "csv") {
    const csv = toCsv(detalle.columnas.map((c) => c.header), detalle.filas);
    return csvResponse(`${nombre}.csv`, csv);
  }
  const buf = await construirXlsx(rep.titulo, filtrosTexto, detalle.columnas, detalle.filas, hoy);
  return xlsxResponse(`${nombre}.xlsx`, buf);
}
