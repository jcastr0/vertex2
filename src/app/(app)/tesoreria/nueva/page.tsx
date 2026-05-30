import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { CuentaForm } from "../cuenta-form";

export const metadata: Metadata = { title: "Nueva cuenta — Vertex" };

export default async function NuevaCuentaPage() {
  await requirePermiso("tesoreria.crear");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Nueva cuenta" description="Registra una cuenta propia de la empresa." />
      <CuentaForm />
    </div>
  );
}
