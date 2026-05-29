import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerBodega } from "@/lib/services/bodegas";
import { PageHeader } from "@/components/page-header";
import { BodegaForm } from "../../bodega-form";

export const metadata: Metadata = { title: "Editar bodega — Vertex" };

export default async function EditarBodegaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("bodegas.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const bodega = await obtenerBodega(empresaId, Number(id));
  if (!bodega) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Editar bodega" description={`Código ${bodega.codigo}`} />
      <BodegaForm
        bodega={{
          id: bodega.id,
          codigo: bodega.codigo,
          nombre: bodega.nombre,
          direccion: bodega.direccion,
          responsable: bodega.responsable,
          telefono: bodega.telefono,
          esPrincipal: bodega.esPrincipal,
        }}
      />
    </div>
  );
}
