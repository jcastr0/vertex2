import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarNotasInventario } from "@/lib/services/notas-inventario";
import { TIPOS_NOTA, esEntrada } from "@/lib/domain/nota-inventario";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Notas de inventario — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarNotasInventario>>[number];
const ETIQUETA: Record<string, string> = Object.fromEntries(TIPOS_NOTA.map((t) => [t.value, t.label]));

export default async function NotasInventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("notas_inventario.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarNotasInventario(empresaId);
  const puedeCrear = puede(sesion.rol, "notas_inventario.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.nota.numero} ${f.producto} ${f.bodega} ${ETIQUETA[f.nota.tipo] ?? ""}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.nota.numero}</span> },
    { header: "Producto", cell: (f) => f.producto },
    { header: "Bodega", cell: (f) => f.bodega },
    {
      header: "Tipo",
      cell: (f) => (
        <Badge variant={esEntrada(f.nota.tipo) ? "default" : "secondary"} className="font-normal">
          {ETIQUETA[f.nota.tipo] ?? f.nota.tipo}
        </Badge>
      ),
    },
    {
      header: "Cantidad",
      className: "text-right",
      cell: (f) => (
        <span className="tabular">
          {esEntrada(f.nota.tipo) ? "+" : "−"}
          {Number(f.nota.cantidad)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Notas de inventario" description="Ajustes de existencias: mermas, daños y diferencias.">
        {puedeCrear && (
          <Link href="/notas-inventario/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva nota
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/notas-inventario"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.nota.id}
        columns={columnas}
        searchPlaceholder="Buscar por número, producto o bodega…"
        hayDatos={todos.length > 0}
        vacio={{ icon: ClipboardList, titulo: "Aún no hay notas", texto: "Registra ajustes de inventario cuando haya mermas o diferencias." }}
      />
    </div>
  );
}
