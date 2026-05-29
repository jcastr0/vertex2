import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { TerceroForm } from "../tercero-form";

export const metadata: Metadata = { title: "Nuevo tercero — Vertex" };

export default async function NuevoTerceroPage() {
  await requirePermiso("terceros.crear");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Nuevo tercero" description="Registra un proveedor o cliente." />
      <TerceroForm />
    </div>
  );
}
