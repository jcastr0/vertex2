import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import {
  obtenerProducto,
  listarUnidadesMedida,
  listarUnidadesProducto,
} from "@/lib/services/productos";
import { listarCategorias } from "@/lib/services/categorias";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { ProductoForm } from "../../producto-form";
import { UnidadesSection } from "../../unidades-section";

export const metadata: Metadata = { title: "Editar producto — Vertex" };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("productos.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const producto = await obtenerProducto(empresaId, Number(id));
  if (!producto) notFound();

  const [categorias, unidades, presentaciones] = await Promise.all([
    listarCategorias(empresaId, "producto"),
    listarUnidadesMedida(),
    listarUnidadesProducto(producto.id),
  ]);

  const unidadBase = unidades.find((u) => u.id === producto.unidadBaseId);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <PageHeader title="Editar producto" description={`SKU ${producto.sku}`} />
        <ProductoForm
          producto={{
            id: producto.id,
            sku: producto.sku,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            categoriaId: producto.categoriaId,
            unidadBaseId: producto.unidadBaseId,
            precioCompraSugerido: producto.precioCompraSugerido,
            stockMinimo: producto.stockMinimo,
            stockMaximo: producto.stockMaximo,
            clasificacionAbc: producto.clasificacionAbc,
          }}
          categorias={categorias.filter((c) => c.activo).map((c) => ({ id: c.id, nombre: c.nombre }))}
          unidades={unidades.map((u) => ({ id: u.id, nombre: u.nombre, abreviatura: u.abreviatura }))}
        />
      </div>

      <Separator />

      <UnidadesSection
        productoId={producto.id}
        unidadBaseAbreviatura={unidadBase?.abreviatura ?? "base"}
        unidades={unidades.map((u) => ({ id: u.id, nombre: u.nombre, abreviatura: u.abreviatura }))}
        presentaciones={presentaciones.map((p) => ({
          id: p.id,
          unidadNombre: p.unidadNombre,
          unidadAbreviatura: p.unidadAbreviatura,
          factorConversion: p.factorConversion,
          precioVenta: p.precioVenta,
          esPrecioCalculado: p.esPrecioCalculado,
          permiteCompra: p.permiteCompra,
          permiteVenta: p.permiteVenta,
        }))}
      />
    </div>
  );
}
