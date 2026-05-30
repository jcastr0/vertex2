import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarRecaudadores } from "@/lib/services/usuarios";
import { PageHeader } from "@/components/page-header";
import { TerceroForm } from "../../tercero-form";
import { listarBeneficiarios } from "@/lib/services/beneficiarios";
import { BeneficiariosPanel } from "../../beneficiarios-panel";

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
  const recaudadores = await listarRecaudadores(empresaId);
  const beneficiarios = (t.tipo === "proveedor" || t.tipo === "ambos")
    ? await listarBeneficiarios(empresaId, t.id)
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Editar tercero" description={t.razonSocial} />
      <TerceroForm
        recaudadores={recaudadores}
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
          recaudadorId: t.recaudadorId,
          diaCobro: t.diaCobro,
        }}
      />
      {(t.tipo === "proveedor" || t.tipo === "ambos") && (
        <div className="mt-8 max-w-2xl">
          <BeneficiariosPanel terceroId={t.id} cuentas={beneficiarios.filter((b) => b.activa)} />
        </div>
      )}
    </div>
  );
}
