import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarCategorias, type Categoria } from "@/lib/services/categorias";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoriaRowActions } from "./categoria-row-actions";
import { Plus, Tags } from "lucide-react";

export const metadata: Metadata = { title: "Categorías — Vertex" };
const PAGE_SIZE = 10;

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("categorias.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todas = await listarCategorias(empresaId);
  const nombrePorId = new Map(todas.map((c) => [c.id, c.nombre]));

  const { items, total, page } = filtrarPaginar(todas, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (c) => c.nombre,
  });

  const puedeCrear = puede(sesion.rol, "categorias.crear");
  const puedeEditar = puede(sesion.rol, "categorias.editar");
  const puedeEliminar = puede(sesion.rol, "categorias.eliminar");

  const columnas: Columna<Categoria>[] = [
    { header: "Nombre", primary: true, cell: (c) => c.nombre },
    { header: "Categoría padre", cell: (c) => (c.padreId ? (nombrePorId.get(c.padreId) ?? "—") : "—") },
    {
      header: "Estado",
      cell: (c) => (
        <Badge variant={c.activo ? "default" : "outline"} className="font-normal">
          {c.activo ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Categorías" description="Clasificación jerárquica de productos.">
        {puedeCrear && (
          <Link href="/categorias/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva categoría
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/categorias"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(c) => c.id}
        rowClassName={(c) => (c.activo ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar categoría…"
        hayDatos={todas.length > 0}
        vacio={{ icon: Tags, titulo: "Aún no hay categorías", texto: "Crea categorías para organizar tu catálogo de productos." }}
        actions={
          puedeEditar || puedeEliminar
            ? (c) => (
                <CategoriaRowActions id={c.id} nombre={c.nombre} activo={c.activo} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />
              )
            : undefined
        }
      />
    </div>
  );
}
