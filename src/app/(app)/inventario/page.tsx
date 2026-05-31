import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarInventario, type FilaInventario } from "@/lib/services/inventario";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Boxes, SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = { title: "Inventario — Vertex" };
const PAGE_SIZE = 10;

const money = (s: string) => "$" + Number(s).toLocaleString("es-CO", { maximumFractionDigits: 2 });
const num = (s: string) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("inventario.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarInventario(empresaId);

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.productoSku} ${f.productoNombre} ${f.bodegaNombre}`,
  });

  const columnas: Columna<FilaInventario>[] = [
    {
      header: "Producto",
      primary: true,
      cell: (f) => (
        <Link href={`/inventario/${f.productoId}`} className="font-medium text-primary hover:underline">
          {f.productoNombre}
        </Link>
      ),
    },
    { header: "Bodega", cell: (f) => f.bodegaNombre },
    { header: "Existencia", className: "text-right", cell: (f) => <span className="tabular">{num(f.cantidadActual)} {f.unidad}</span> },
    { header: "Costo prom.", className: "text-right", cell: (f) => <span className="tabular">{money(f.costoPromedio)}</span> },
    { header: "Valor", className: "text-right", cell: (f) => <span className="tabular font-medium">{money(f.valorTotal)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Inventario" description="Existencias por bodega, valorizadas a costo promedio.">
        {puede(permisos, "notas_inventario.crear") && (
          <Link href="/notas-inventario/nueva" className={buttonVariants({ variant: "outline" })}>
            <SlidersHorizontal className="size-4" /> Ajustar (merma/sobrante)
          </Link>
        )}
      </PageHeader>
      <ListaFiltrable
        base="/inventario"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.id}
        columns={columnas}
        searchPlaceholder="Buscar por producto, SKU o bodega…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Boxes, titulo: "Sin existencias todavía", texto: "Recibe un pedido para que el inventario se actualice." }}
      />
    </div>
  );
}
