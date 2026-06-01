import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerRetencion } from "@/lib/services/retenciones";
import { PageHeader } from "@/components/page-header";
import { RetencionForm } from "../../retencion-form";

export const metadata: Metadata = { title: "Editar retención — Vertex" };

export default async function EditarRetencionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("retenciones.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const retencion = await obtenerRetencion(empresaId, parseId(id));
  if (!retencion) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Editar retención" description={retencion.nombre} />
      <RetencionForm
        retencion={{
          id: retencion.id,
          nombre: retencion.nombre,
          porcentaje: retencion.porcentaje,
          baseMinima: retencion.baseMinima,
          aplicaTodas: retencion.aplicaTodas,
          activa: retencion.activa,
        }}
      />
    </div>
  );
}
