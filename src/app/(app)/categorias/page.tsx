import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
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
import { CategoriaRowActions } from "./categoria-row-actions";
import { Plus, Tags } from "lucide-react";

export const metadata: Metadata = { title: "Categorías — Vertex" };

export default async function CategoriasPage() {
  const sesion = await requirePermiso("categorias.ver");
  const { empresaId } = await requireEmpresa();
  const categorias = await listarCategorias(empresaId);
  const nombrePorId = new Map(categorias.map((c) => [c.id, c.nombre]));

  const puedeCrear = puede(sesion.rol, "categorias.crear");
  const puedeEditar = puede(sesion.rol, "categorias.editar");
  const puedeEliminar = puede(sesion.rol, "categorias.eliminar");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Categorías" description="Clasificación jerárquica de productos.">
        {puedeCrear && (
          <Link href="/categorias/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva categoría
          </Link>
        )}
      </PageHeader>

      {categorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Tags className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay categorías</p>
          <p className="text-sm text-muted-foreground">
            Crea categorías para organizar tu catálogo de productos.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría padre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c) => (
                <TableRow key={c.id} className={c.activo ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.padreId ? (nombrePorId.get(c.padreId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "default" : "outline"} className="font-normal">
                      {c.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(puedeEditar || puedeEliminar) && (
                      <CategoriaRowActions
                        id={c.id}
                        nombre={c.nombre}
                        activo={c.activo}
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
