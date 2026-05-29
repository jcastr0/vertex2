import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarProductos, listarUnidadesMedida, type Producto } from "@/lib/services/productos";
import { listarCategorias } from "@/lib/services/categorias";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductoRowActions } from "./producto-row-actions";
import { Plus, Package } from "lucide-react";

export const metadata: Metadata = { title: "Productos — Vertex" };

export default async function ProductosPage() {
  const sesion = await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const [productos, categorias, unidades] = await Promise.all([
    listarProductos(empresaId),
    listarCategorias(empresaId),
    listarUnidadesMedida(),
  ]);
  const catPorId = new Map(categorias.map((c) => [c.id, c.nombre]));
  const undPorId = new Map(unidades.map((u) => [u.id, u.abreviatura]));

  const puedeCrear = puede(sesion.rol, "productos.crear");
  const puedeEditar = puede(sesion.rol, "productos.editar");
  const puedeEliminar = puede(sesion.rol, "productos.eliminar");

  const columnas: Columna<Producto>[] = [
    {
      header: "Producto",
      primary: true,
      cell: (p) => (
        <div>
          <div>{p.nombre}</div>
          <div className="text-xs font-normal text-muted-foreground tabular">{p.sku}</div>
        </div>
      ),
    },
    { header: "Categoría", cell: (p) => (p.categoriaId ? (catPorId.get(p.categoriaId) ?? "—") : "—") },
    { header: "Unidad base", cell: (p) => undPorId.get(p.unidadBaseId) ?? "—" },
    {
      header: "Estado",
      cell: (p) => (
        <Badge variant={p.activo ? "default" : "outline"} className="font-normal">
          {p.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Productos" description="Catálogo de productos de la empresa.">
        {puedeCrear && (
          <Link href="/productos/nuevo" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo producto
          </Link>
        )}
      </PageHeader>

      {productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Package className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay productos</p>
          <p className="text-sm text-muted-foreground">
            Crea tu primer producto para gestionar inventario y ventas.
          </p>
        </div>
      ) : (
        <ResponsiveTable
          items={productos}
          getKey={(p) => p.id}
          rowClassName={(p) => (p.activo ? "" : "opacity-60")}
          columns={columnas}
          actions={
            puedeEditar || puedeEliminar
              ? (p) => (
                  <ProductoRowActions
                    id={p.id}
                    nombre={p.nombre}
                    activo={p.activo}
                    puedeEditar={puedeEditar}
                    puedeEliminar={puedeEliminar}
                  />
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
