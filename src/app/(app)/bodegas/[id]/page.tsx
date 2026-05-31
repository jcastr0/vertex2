import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { fichaBodega } from "@/lib/services/fichas";
import { PageHeader } from "@/components/page-header";
import { KpiFila } from "@/components/reportes/kpi";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { FichaBodegaProducto, FichaBodegaMovimiento } from "@/lib/services/fichas";

export const metadata: Metadata = { title: "Bodega — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function BodegaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("bodegas.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const f = await fichaBodega(empresaId, Number(id));
  if (!f) notFound();
  const permisos = await getPermisos();
  const puedeEditar = puede(permisos, "bodegas.editar");

  const colsProductos: Columna<FichaBodegaProducto>[] = [
    { header: "Producto", primary: true, cell: (p) => <span className="font-medium">{p.nombre}</span> },
    { header: "SKU", cell: (p) => <span className="tabular text-muted-foreground">{p.sku}</span> },
    { header: "Existencia", className: "text-right", cell: (p) => <span className="tabular">{num(p.existencia)} {p.unidad}</span> },
    { header: "Costo prom.", className: "text-right", cell: (p) => <span className="tabular">{money(p.costoPromedio)}</span> },
    { header: "Valor", className: "text-right", cell: (p) => <span className="tabular">{money(p.valor)}</span> },
  ];
  const colsMovs: Columna<FichaBodegaMovimiento>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{new Date(m.fecha).toLocaleDateString("es-CO")}</span> },
    { header: "Tipo", cell: (m) => <Badge variant="secondary" className="font-normal capitalize">{m.tipo.replace("_", " ")}</Badge> },
    { header: "Producto", cell: (m) => m.productoNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={f.bodega.nombre} description={`Código ${f.bodega.codigo}${f.bodega.responsable ? " · " + f.bodega.responsable : ""}`}>
        {puedeEditar && (
          <Link href={`/bodegas/${f.bodega.id}/editar`} className={buttonVariants({ variant: "outline" })}>Editar bodega</Link>
        )}
      </PageHeader>

      <KpiFila kpis={[
        { label: "Productos en stock", valor: f.productosDistintos, formato: "num" },
        { label: "Valor del inventario", valor: f.valorInventario, formato: "money" },
        { label: "Sin existencia", valor: f.sinExistencia, formato: "num" },
      ]} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Productos en la bodega</h2>
        {f.productos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Esta bodega no tiene productos con inventario.</div>
        ) : (
          <ResponsiveTable items={f.productos} getKey={(p) => p.productoId} columns={colsProductos} rowHref={(p) => `/productos/${p.productoId}`} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Últimos movimientos</h2>
        {f.ultimosMovimientos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Sin movimientos recientes.</div>
        ) : (
          <ResponsiveTable items={f.ultimosMovimientos} getKey={(m) => m.id} columns={colsMovs} />
        )}
      </section>
    </div>
  );
}
