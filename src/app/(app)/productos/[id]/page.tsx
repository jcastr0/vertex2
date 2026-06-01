import type { Metadata } from "next";
import { fechaInstante } from "@/lib/fecha";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { fichaProducto } from "@/lib/services/fichas";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { FichaProductoExistencia, FichaProductoMerma } from "@/lib/services/fichas";

export const metadata: Metadata = { title: "Producto — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const f = await fichaProducto(empresaId, parseId(id));
  if (!f) notFound();
  const permisos = await getPermisos();
  const puedeEditar = puede(permisos, "productos.editar");

  const colsExist: Columna<FichaProductoExistencia>[] = [
    { header: "Bodega", primary: true, cell: (x) => <span className="font-medium">{x.bodegaNombre}</span> },
    { header: "Existencia", className: "text-right", cell: (x) => <span className="tabular">{num(x.existencia)}</span> },
    { header: "Valor", className: "text-right", cell: (x) => <span className="tabular">{money(x.valor)}</span> },
  ];
  const colsMerma: Columna<FichaProductoMerma>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{fechaInstante(m.fecha)}</span> },
    { header: "Bodega", cell: (m) => m.bodegaNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
    { header: "Motivo", cell: (m) => m.motivo },
  ];
  const stockValor = f.existencias.reduce((s, x) => s + x.valor, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={f.producto.nombre} description={`SKU ${f.producto.sku}`}>
        <div className="flex gap-2">
          <Link href={`/inventario/${f.producto.id}`} className={buttonVariants({ variant: "outline" })}>Ver kardex</Link>
          {puedeEditar && <Link href={`/productos/${f.producto.id}/editar`} className={buttonVariants({ variant: "outline" })}>Editar</Link>}
        </div>
      </PageHeader>

      {/* Lo principal: cuánto hay ahora */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.08] to-transparent p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stock actual</p>
        <p className="tabular text-4xl font-bold tracking-tight">{num(f.stockTotal)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          valorizado en <span className="font-medium text-foreground">{money(stockValor)}</span>
          {f.existencias.length > 0 && ` · en ${f.existencias.length} bodega${f.existencias.length !== 1 ? "s" : ""}`}
        </p>
      </section>

      {/* Cómo se forma el stock — reconciliación desde el kardex (siempre cuadra) */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Cómo se forma el stock</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Existencia inicial / ajustes</span>
            <span className="tabular">{num(f.reconciliacion.inicial)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">+ Entradas (compras, devoluciones)</span>
            <span className="tabular text-primary">+{num(f.reconciliacion.entradas)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">− Salidas (ventas, mermas, traslados)</span>
            <span className="tabular text-destructive">−{num(f.reconciliacion.salidas)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold">
            <span>= Stock actual</span>
            <span className="tabular">{num(f.reconciliacion.stock)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          El stock sale del <strong>kardex</strong> (todos los movimientos), no de “comprado − vendido”: también cuentan la
          existencia inicial, las devoluciones, las mermas y los traslados.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Actividad</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica label="Vendido" total={f.vendidoCantidad.total} ultimos30={f.vendidoCantidad.ultimos30} pie={`${money(f.vendidoMonto.total)} en ventas`} href={`/productos/${f.producto.id}/ventas`} />
          <Metrica label="Comprado" total={f.compradoCantidad.total} ultimos30={f.compradoCantidad.ultimos30} pie={`${f.pedidosDistintos} pedido${f.pedidosDistintos !== 1 ? "s" : ""} · recibido ${num(f.cantidadRecibida)}`} href={`/productos/${f.producto.id}/compras`} />
          <Metrica label="Merma" total={f.mermaCantidad.total} ultimos30={f.mermaCantidad.ultimos30} pie="salidas por notas de inventario" />
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

/**
 * Una métrica de actividad: número grande + contexto + últimos 30 días.
 * Con `href`, toda la tarjeta abre el detalle (en qué facturas/pedidos) — descubrimiento en profundidad.
 */
function Metrica({ label, total, ultimos30, pie, href }: { label: string; total: number; ultimos30: number; pie: string; href?: string }) {
  const cuerpo = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href && <span className="inline-flex items-center gap-0.5 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">Ver detalle <ChevronRight className="size-3" /></span>}
      </div>
      <p className="tabular text-2xl font-bold tracking-tight">{num(total)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{pie}</p>
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
        Últimos 30 días: <span className="tabular font-medium text-foreground">{num(ultimos30)}</span>
      </p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        {cuerpo}
      </Link>
    );
  }
  return <div className="rounded-2xl border border-border bg-card p-4">{cuerpo}</div>;
}
