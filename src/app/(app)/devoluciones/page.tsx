import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarDevoluciones } from "@/lib/services/devoluciones";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Undo2 } from "lucide-react";

export const metadata: Metadata = { title: "Devoluciones — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarDevoluciones>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function DevolucionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("devoluciones.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarDevoluciones(empresaId);
  const puedeCrear = puede(permisos, "devoluciones.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.devolucion.numero} ${f.cliente}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.devolucion.numero}</span> },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => f.devolucion.fecha },
    { header: "Estado", cell: (f) => <Badge className="font-normal capitalize">{f.devolucion.estado}</Badge> },
    { header: "Total", className: "text-right", cell: (f) => <span className="tabular">{money(f.devolucion.total)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Devoluciones de clientes" description="Reingresan inventario y generan nota crédito.">
        {puedeCrear && (
          <Link href="/devoluciones/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva devolución
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/devoluciones"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.devolucion.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o cliente…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Undo2, titulo: "Aún no hay devoluciones", texto: "Procesa una devolución cuando un cliente regrese productos." }}
      />
    </div>
  );
}
