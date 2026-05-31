import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarRecaudadores } from "@/lib/services/usuarios";
import { PageHeader } from "@/components/page-header";
import { TerceroForm } from "../tercero-form";

export const metadata: Metadata = { title: "Nuevo tercero — Vertex" };

export default async function NuevoTerceroPage() {
  await requirePermiso("terceros.crear");
  const { empresaId } = await requireEmpresa();
  const recaudadores = await listarRecaudadores(empresaId);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo tercero" description="Registra un proveedor o cliente." />
      <TerceroForm recaudadores={recaudadores} />
    </div>
  );
}
