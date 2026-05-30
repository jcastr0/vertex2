import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { EmpresaForm } from "../empresa-form";

export const metadata: Metadata = { title: "Nueva empresa — Vertex" };

export default async function NuevaEmpresaPage() {
  await requirePermiso("empresas.crear");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nueva empresa" description="Registra una razón social." />
      <EmpresaForm />
    </div>
  );
}
