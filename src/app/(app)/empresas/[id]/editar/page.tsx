import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/guard";
import { obtenerEmpresa } from "@/lib/services/empresas";
import { PageHeader } from "@/components/page-header";
import { EmpresaForm } from "../../empresa-form";

export const metadata: Metadata = { title: "Editar empresa — Vertex" };

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("empresas.editar");
  const { id } = await params;
  const e = await obtenerEmpresa(Number(id));
  if (!e) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Editar empresa" description={e.nombre} />
      <EmpresaForm empresa={{ id: e.id, nombre: e.nombre, razonSocial: e.razonSocial, nit: e.nit, email: e.email, telefono: e.telefono, direccion: e.direccion, ciudad: e.ciudad, pais: e.pais }} />
    </div>
  );
}
