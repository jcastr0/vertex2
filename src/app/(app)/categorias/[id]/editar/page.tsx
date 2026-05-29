import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerCategoria, listarCategorias } from "@/lib/services/categorias";
import { PageHeader } from "@/components/page-header";
import { CategoriaForm } from "../../categoria-form";

export const metadata: Metadata = { title: "Editar categoría — Vertex" };

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("categorias.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const categoria = await obtenerCategoria(empresaId, Number(id));
  if (!categoria) notFound();
  const categorias = await listarCategorias(empresaId);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Editar categoría" description={categoria.nombre} />
      <CategoriaForm
        categoria={{
          id: categoria.id,
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          padreId: categoria.padreId,
        }}
        opcionesPadre={categorias.filter((c) => c.activo).map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
