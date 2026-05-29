import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { BodegaForm } from "../bodega-form";

export const metadata: Metadata = { title: "Nueva bodega — Vertex" };

export default async function NuevaBodegaPage() {
  await requirePermiso("bodegas.crear");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nueva bodega" description="Registra un almacén físico." />
      <BodegaForm />
    </div>
  );
}
