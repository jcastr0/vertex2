import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarBodegas, type Bodega } from "@/lib/services/bodegas";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BodegaRowActions } from "./bodega-row-actions";
import { Plus, Warehouse } from "lucide-react";

export const metadata: Metadata = { title: "Bodegas — Vertex" };
const PAGE_SIZE = 10;

export default async function BodegasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("bodegas.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todas = await listarBodegas(empresaId);

  const { items, total, page } = filtrarPaginar(todas, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (b) => `${b.codigo} ${b.nombre} ${b.responsable ?? ""}`,
  });

  const puedeCrear = puede(permisos, "bodegas.crear");
  const puedeEditar = puede(permisos, "bodegas.editar");
  const puedeEliminar = puede(permisos, "bodegas.eliminar");

  const columnas: Columna<Bodega>[] = [
    {
      header: "Código",
      primary: true,
      className: "w-28",
      cell: (b) => <span className="tabular font-medium">{b.codigo}</span>,
    },
    {
      header: "Nombre",
      cell: (b) => (
        <div className="flex items-center gap-2">
          {b.nombre}
          {b.esPrincipal && <Badge variant="secondary" className="font-normal">Principal</Badge>}
        </div>
      ),
    },
    { header: "Responsable", cell: (b) => b.responsable ?? "—" },
    {
      header: "Estado",
      cell: (b) => (
        <Badge variant={b.activo ? "default" : "outline"} className="font-normal">
          {b.activo ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Bodegas" description="Almacenes físicos de la empresa.">
        {puedeCrear && (
          <Link href="/bodegas/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva bodega
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/bodegas"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(b) => b.id}
        rowClassName={(b) => (b.activo ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar por código, nombre o responsable…"
        hayDatos={todas.length > 0}
        vacio={{ icon: Warehouse, titulo: "Aún no hay bodegas", texto: "Crea la primera bodega para empezar a gestionar inventario." }}
        actions={
          puedeEditar || puedeEliminar
            ? (b) => (
                <BodegaRowActions id={b.id} nombre={b.nombre} activo={b.activo} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />
              )
            : undefined
        }
      />
    </div>
  );
}
