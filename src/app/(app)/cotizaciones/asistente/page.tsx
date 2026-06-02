import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { AsistenteForm } from "../asistente-form";

export const metadata: Metadata = { title: "Asistente de pedidos — Vertex" };

export default async function AsistentePage() {
  await requirePermiso("cotizaciones.crear");
  const { empresaId } = await requireEmpresa();
  const terceros = await listarTerceros(empresaId);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Asistente de pedidos" description="Pega el pedido del cliente (texto o foto); el asistente arma la cotización para confirmar." />
      <AsistenteForm clientes={terceros.filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos")).map((t) => ({ id: t.id, nombre: t.razonSocial }))} />
    </div>
  );
}
