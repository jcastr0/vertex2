import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarBodegas, type Bodega } from "@/lib/services/bodegas";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BodegaRowActions } from "./bodega-row-actions";
import { Plus, Warehouse } from "lucide-react";

export const metadata: Metadata = { title: "Bodegas — Vertex" };

export default async function BodegasPage() {
  const sesion = await requirePermiso("bodegas.ver");
  const { empresaId } = await requireEmpresa();
  const bodegas = await listarBodegas(empresaId);

  const puedeCrear = puede(sesion.rol, "bodegas.crear");
  const puedeEditar = puede(sesion.rol, "bodegas.editar");
  const puedeEliminar = puede(sesion.rol, "bodegas.eliminar");

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
          {b.esPrincipal && (
            <Badge variant="secondary" className="font-normal">
              Principal
            </Badge>
          )}
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

      {bodegas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Warehouse className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay bodegas</p>
          <p className="text-sm text-muted-foreground">
            Crea la primera bodega para empezar a gestionar inventario.
          </p>
        </div>
      ) : (
        <ResponsiveTable
          items={bodegas}
          getKey={(b) => b.id}
          rowClassName={(b) => (b.activo ? "" : "opacity-60")}
          columns={columnas}
          actions={
            puedeEditar || puedeEliminar
              ? (b) => (
                  <BodegaRowActions
                    id={b.id}
                    nombre={b.nombre}
                    activo={b.activo}
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
