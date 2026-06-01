import type { Metadata } from "next";
import { fechaHora } from "@/lib/fecha";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { kardexProducto } from "@/lib/services/inventario";
import { obtenerProducto } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import type { MovimientoKardex } from "@/lib/services/inventario";

export const metadata: Metadata = { title: "Kardex — Vertex" };

const num = (s: string) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (s: string | null) => (s ? "$" + Number(s).toLocaleString("es-CO") : "—");

const ENTRADAS = ["entrada", "traslado_entrada", "ajuste"];

export default async function KardexPage({ params }: { params: Promise<{ productoId: string }> }) {
  await requirePermiso("inventario.ver");
  const { empresaId } = await requireEmpresa();
  const { productoId } = await params;
  const producto = await obtenerProducto(empresaId, parseId(productoId));
  if (!producto) notFound();
  const movimientos = await kardexProducto(empresaId, producto.id);

  const columnas: Columna<MovimientoKardex>[] = [
    {
      header: "Fecha",
      primary: true,
      cell: (m) => <span className="tabular">{fechaHora(m.fecha)}</span>,
    },
    {
      header: "Tipo",
      cell: (m) => (
        <Badge variant={ENTRADAS.includes(m.tipo) ? "default" : "secondary"} className="font-normal capitalize">
          {m.tipo.replace("_", " ")}
        </Badge>
      ),
    },
    { header: "Bodega", cell: (m) => m.bodegaNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
    { header: "Costo unit.", className: "text-right", cell: (m) => <span className="tabular">{money(m.costoUnitario)}</span> },
    { header: "Ref.", cell: (m) => m.referencia ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={`Kardex — ${producto.nombre}`} description={`SKU ${producto.sku}`} />
      {movimientos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Sin movimientos registrados para este producto.
        </div>
      ) : (
        <ResponsiveTable items={movimientos} getKey={(m) => m.id} columns={columnas} />
      )}
    </div>
  );
}
