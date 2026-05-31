import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarEmpresas, type Empresa } from "@/lib/services/empresas";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmpresaRowActions } from "./empresa-row-actions";
import { Plus, Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Empresas — Vertex" };
const PAGE_SIZE = 10;

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("empresas.ver");
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todas = await listarEmpresas();
  const puedeCrear = puede(permisos, "empresas.crear");
  const puedeEditar = puede(permisos, "empresas.editar");

  const { items, total, page } = filtrarPaginar(todas, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (e) => `${e.nombre} ${e.razonSocial} ${e.nit}`,
  });

  const columnas: Columna<Empresa>[] = [
    { header: "Nombre", primary: true, cell: (e) => e.nombre },
    { header: "NIT", cell: (e) => <span className="tabular">{e.nit}</span> },
    { header: "Ciudad", cell: (e) => e.ciudad ?? "—" },
    {
      header: "Estado",
      cell: (e) => (
        <Badge variant={e.activa ? "default" : "outline"} className="font-normal">
          {e.activa ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Empresas" description="Razones sociales del sistema.">
        {puedeCrear && (
          <Link href="/empresas/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva empresa
          </Link>
        )}
      </PageHeader>
      <ListaFiltrable
        base="/empresas"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(e) => e.id}
        rowClassName={(e) => (e.activa ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar por nombre o NIT…"
        hayDatos={todas.length > 0}
        vacio={{ icon: Building2, titulo: "Sin empresas", texto: "Crea la primera empresa del sistema." }}
        actions={puedeEditar ? (e) => <EmpresaRowActions id={e.id} activa={e.activa} /> : undefined}
      />
    </div>
  );
}
