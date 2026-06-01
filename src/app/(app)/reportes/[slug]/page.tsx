import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getReporte, filtrosConDefaults } from "@/lib/reportes/registry";
import { PageHeader } from "@/components/page-header";
import { FiltroReporte } from "@/components/reportes/filtro-reporte";
import { ExportBotones } from "@/components/reportes/export-botones";
import { ReporteDashboard } from "@/components/reportes/dashboard";

export const metadata: Metadata = { title: "Reporte — Vertex" };

export default async function ReporteSlugPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermiso("reportes.ver");
  const { empresaId } = await requireEmpresa();
  const { slug } = await params;
  const rep = getReporte(slug);
  if (!rep) notFound();

  const hoy = hoyColombia();
  const sp = await searchParams;
  const filtros = filtrosConDefaults(sp, hoy);
  const [datos, filtrosSpec] = await Promise.all([rep.cargar(empresaId, filtros), rep.filtros(empresaId)]);
  const query = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={rep.titulo} description={rep.desc}>
        <ExportBotones slug={rep.slug} query={query} />
      </PageHeader>
      <FiltroReporte filtros={filtrosSpec} />
      <ReporteDashboard datos={datos} charts={rep.charts} />
    </div>
  );
}
