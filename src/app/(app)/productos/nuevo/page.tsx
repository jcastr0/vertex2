import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarUnidadesMedida } from "@/lib/services/productos";
import { listarCategorias } from "@/lib/services/categorias";
import { PageHeader } from "@/components/page-header";
import { ProductoForm } from "../producto-form";

export const metadata: Metadata = { title: "Nuevo producto — Vertex" };

export default async function NuevoProductoPage() {
  await requirePermiso("productos.crear");
  const { empresaId } = await requireEmpresa();
  const [categorias, unidades] = await Promise.all([
    listarCategorias(empresaId),
    listarUnidadesMedida(),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Nuevo producto" description="Datos básicos. Las presentaciones se agregan al guardar." />
      <ProductoForm
        categorias={categorias.filter((c) => c.activo).map((c) => ({ id: c.id, nombre: c.nombre }))}
        unidades={unidades.map((u) => ({ id: u.id, nombre: u.nombre, abreviatura: u.abreviatura }))}
      />
    </div>
  );
}
