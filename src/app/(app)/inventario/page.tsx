import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarInventario, type FilaInventario } from "@/lib/services/inventario";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { Boxes } from "lucide-react";

export const metadata: Metadata = { title: "Inventario — Vertex" };

const money = (s: string) => "$" + Number(s).toLocaleString("es-CO", { maximumFractionDigits: 2 });
const num = (s: string) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });

export default async function InventarioPage() {
  await requirePermiso("inventario.ver");
  const { empresaId } = await requireEmpresa();
  const filas = await listarInventario(empresaId);

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
    {
      header: "Existencia",
      className: "text-right",
      cell: (f) => <span className="tabular">{num(f.cantidadActual)} {f.unidad}</span>,
    },
    {
      header: "Costo prom.",
      className: "text-right",
      cell: (f) => <span className="tabular">{money(f.costoPromedio)}</span>,
    },
    {
      header: "Valor",
      className: "text-right",
      cell: (f) => <span className="tabular font-medium">{money(f.valorTotal)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Inventario" description="Existencias por bodega, valorizadas a costo promedio." />
      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Boxes className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Sin existencias todavía</p>
          <p className="text-sm text-muted-foreground">
            Recibe un pedido para que el inventario se actualice.
          </p>
        </div>
      ) : (
        <ResponsiveTable items={filas} getKey={(f) => f.id} columns={columnas} />
      )}
    </div>
  );
}
