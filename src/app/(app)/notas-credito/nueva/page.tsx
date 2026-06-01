import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { NotaCreditoForm } from "../nota-credito-form";

export const metadata: Metadata = { title: "Nueva nota crédito — Vertex" };

export default async function NuevaNotaCreditoPage() {
  await requirePermiso("notas_credito.crear");
  const { empresaId } = await requireEmpresa();
  const terceros = await listarTerceros(empresaId);
  const hoy = hoyColombia();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Nueva nota crédito" description="Aplica un descuento o corrección a una factura del cliente." />
      <NotaCreditoForm
        hoy={hoy}
        clientes={terceros
          .filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos"))
          .map((t) => ({ id: t.id, nombre: t.razonSocial }))}
      />
    </div>
  );
}
