import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarNotasCredito } from "@/lib/services/devoluciones";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { FileMinus, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Notas crédito — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarNotasCredito>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function NotasCreditoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("notas_credito.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarNotasCredito(empresaId);

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.nota.numero} ${f.cliente} ${f.nota.motivo}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.nota.numero}</span> },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => f.nota.fecha },
    { header: "Motivo", cell: (f) => <span className="text-muted-foreground">{f.nota.motivo}</span> },
    { header: "Valor", className: "text-right", cell: (f) => <span className="tabular">{money(f.nota.valor)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Notas crédito" description="Por devolución, o manuales (descuento/corrección).">
        {puede(permisos, "notas_credito.crear") && (
          <Link href="/notas-credito/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva nota crédito
          </Link>
        )}
      </PageHeader>
      <ListaFiltrable
        base="/notas-credito"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.nota.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o cliente…"
        hayDatos={todos.length > 0}
        vacio={{ icon: FileMinus, titulo: "Aún no hay notas crédito", texto: "Se generan automáticamente al procesar devoluciones." }}
      />
    </div>
  );
}
