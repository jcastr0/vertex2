import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarProductos, listarUnidadesMedida } from "@/lib/services/productos";
import { listarCategorias } from "@/lib/services/categorias";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Unidad base</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => (
                <TableRow key={p.id} className={p.activo ? "" : "opacity-60"}>
                  <TableCell className="tabular font-medium">{p.sku}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.categoriaId ? (catPorId.get(p.categoriaId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {undPorId.get(p.unidadBaseId) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.activo ? "default" : "outline"} className="font-normal">
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(puedeEditar || puedeEliminar) && (
                      <ProductoRowActions
                        id={p.id}
                        nombre={p.nombre}
                        activo={p.activo}
                        puedeEditar={puedeEditar}
                        puedeEliminar={puedeEliminar}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
