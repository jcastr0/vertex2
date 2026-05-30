import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { RetencionForm } from "../retencion-form";

export const metadata: Metadata = { title: "Nueva retención — Vertex" };

export default async function NuevaRetencionPage() {
  await requirePermiso("retenciones.crear");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Nueva retención" description="Parametriza una retención sobre los pagos." />
      <RetencionForm />
    </div>
  );
}
