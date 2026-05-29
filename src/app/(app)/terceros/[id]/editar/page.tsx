import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerTercero } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { TerceroForm } from "../../tercero-form";

export const metadata: Metadata = { title: "Editar tercero — Vertex" };

export default async function EditarTerceroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("terceros.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const t = await obtenerTercero(empresaId, Number(id));
  if (!t) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Editar tercero" description={t.razonSocial} />
      <TerceroForm
        tercero={{
          id: t.id,
          tipo: t.tipo,
          codigo: t.codigo,
          razonSocial: t.razonSocial,
          nombreComercial: t.nombreComercial,
          tipoIdentificacion: t.tipoIdentificacion,
          identificacion: t.identificacion,
          tipoPersona: t.tipoPersona,
          email: t.email,
          telefono: t.telefono,
          celular: t.celular,
          direccion: t.direccion,
          ciudad: t.ciudad,
          departamento: t.departamento,
          condicionesPago: t.condicionesPago,
          diasCreditoProveedor: t.diasCreditoProveedor,
          cupoCredito: t.cupoCredito,
          diasCreditoCliente: t.diasCreditoCliente,
          requiereFacturaElectronica: t.requiereFacturaElectronica,
          observaciones: t.observaciones,
        }}
      />
    </div>
  );
}
