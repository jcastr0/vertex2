import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarCategorias } from "@/lib/services/categorias";
import { PageHeader } from "@/components/page-header";
import { CategoriaForm } from "../categoria-form";

export const metadata: Metadata = { title: "Nueva categoría — Vertex" };

export default async function NuevaCategoriaPage() {
  await requirePermiso("categorias.crear");
  const { empresaId } = await requireEmpresa();
  const categorias = await listarCategorias(empresaId);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Nueva categoría" description="Clasifica tus productos." />
      <CategoriaForm opcionesPadre={categorias.filter((c) => c.activo).map((c) => ({ id: c.id, nombre: c.nombre }))} />
    </div>
  );
}
