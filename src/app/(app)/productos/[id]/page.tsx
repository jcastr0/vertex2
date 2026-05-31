import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { fichaProducto } from "@/lib/services/fichas";
import { PageHeader } from "@/components/page-header";
import { KpiFila } from "@/components/reportes/kpi";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import type { FichaProductoExistencia, FichaProductoMerma } from "@/lib/services/fichas";

export const metadata: Metadata = { title: "Producto — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const f = await fichaProducto(empresaId, Number(id));
  if (!f) notFound();
  const permisos = await getPermisos();
  const puedeEditar = puede(permisos, "productos.editar");

  const colsExist: Columna<FichaProductoExistencia>[] = [
    { header: "Bodega", primary: true, cell: (x) => <span className="font-medium">{x.bodegaNombre}</span> },
    { header: "Existencia", className: "text-right", cell: (x) => <span className="tabular">{num(x.existencia)}</span> },
    { header: "Valor", className: "text-right", cell: (x) => <span className="tabular">{money(x.valor)}</span> },
  ];
  const colsMerma: Columna<FichaProductoMerma>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{new Date(m.fecha).toLocaleDateString("es-CO")}</span> },
    { header: "Bodega", cell: (m) => m.bodegaNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
    { header: "Motivo", cell: (m) => m.motivo },
  ];
  const periodo = (k: { total: number; ultimos30: number }, fmt = false) =>
    `${fmt ? money(k.total) : num(k.total)} · 30d: ${fmt ? money(k.ultimos30) : num(k.ultimos30)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={f.producto.nombre} description={`SKU ${f.producto.sku}`}>
        <div className="flex gap-2">
          <Link href={`/inventario/${f.producto.id}`} className={buttonVariants({ variant: "outline" })}>Ver kardex</Link>
          {puedeEditar && <Link href={`/productos/${f.producto.id}/editar`} className={buttonVariants({ variant: "outline" })}>Editar</Link>}
        </div>
      </PageHeader>

      <KpiFila kpis={[
        { label: "Stock total", valor: f.stockTotal, formato: "num" },
        { label: "Vendido (total)", valor: f.vendidoCantidad.total, formato: "num" },
        { label: "Vendido $", valor: f.vendidoMonto.total, formato: "money" },
        { label: "Merma (total)", valor: f.mermaCantidad.total, formato: "num" },
      ]} />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vendido</p>
          <p className="tabular text-lg font-semibold">{periodo(f.vendidoCantidad)}</p>
          <p className="text-xs text-muted-foreground">{money(f.vendidoMonto.total)} histórico</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Comprado</p>
          <p className="tabular text-lg font-semibold">{periodo(f.compradoCantidad)}</p>
          <p className="text-xs text-muted-foreground">Traído en {f.pedidosDistintos} pedido(s) · recibido {num(f.cantidadRecibida)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Merma</p>
          <p className="tabular text-lg font-semibold">{periodo(f.mermaCantidad)}</p>
          <p className="text-xs text-muted-foreground">Salidas por notas de inventario</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Existencias por bodega</h2>
        {f.existencias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Sin existencias registradas.</div>
        ) : (
          <ResponsiveTable items={f.existencias} getKey={(x) => x.bodegaId} columns={colsExist} rowHref={(x) => `/bodegas/${x.bodegaId}`} />
        )}
      </section>

      {f.mermas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Últimas mermas / ajustes</h2>
          <ResponsiveTable items={f.mermas} getKey={(m) => m.id} columns={colsMerma} />
        </section>
      )}
    </div>
  );
}
