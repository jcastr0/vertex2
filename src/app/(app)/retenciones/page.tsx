import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarRetenciones, type Retencion } from "@/lib/services/retenciones";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RetencionRowActions } from "./retencion-row-actions";
import { Plus, Percent } from "lucide-react";

export const metadata: Metadata = { title: "Retenciones — Vertex" };
const PAGE_SIZE = 10;
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function RetencionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("retenciones.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todas = await listarRetenciones(empresaId);

  const { items, total, page } = filtrarPaginar(todas, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (r) => r.nombre,
  });

  const puedeCrear = puede(permisos, "retenciones.crear");
  const puedeEditar = puede(permisos, "retenciones.editar");
  const puedeEliminar = puede(permisos, "retenciones.eliminar");

  const columnas: Columna<Retencion>[] = [
    { header: "Nombre", primary: true, cell: (r) => r.nombre },
    { header: "Porcentaje", className: "text-right", cell: (r) => <span className="tabular">{Number(r.porcentaje)}%</span> },
    { header: "Base mínima", className: "text-right", cell: (r) => <span className="tabular">{money(r.baseMinima)}</span> },
    {
      header: "Estado",
      cell: (r) => (
        <Badge variant={r.activa ? "default" : "outline"} className="font-normal">
          {r.activa ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Retenciones"
        description="Se descuentan automáticamente en pagos a proveedores con factura electrónica."
      >
        {puedeCrear && (
          <Link href="/retenciones/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva retención
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/retenciones"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(r) => r.id}
        rowClassName={(r) => (r.activa ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar retención…"
        hayDatos={todas.length > 0}
        vacio={{
          icon: Percent,
          titulo: "Aún no hay retenciones",
          texto: "Crea retenciones para descontarlas de los pagos a proveedores que facturan electrónicamente.",
        }}
        actions={
          puedeEditar || puedeEliminar
            ? (r) => (
                <RetencionRowActions
                  id={r.id}
                  nombre={r.nombre}
                  activa={r.activa}
                  puedeEditar={puedeEditar}
                  puedeEliminar={puedeEliminar}
                />
              )
            : undefined
        }
      />
    </div>
  );
}
