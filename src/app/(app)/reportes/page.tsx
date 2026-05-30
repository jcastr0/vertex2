import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { kpis, stockBajo, cxcVencidas, novedadesPorProveedor, type FilaStockBajo, type FilaVencida } from "@/lib/services/reportes";
import { rangoMes } from "@/lib/domain/periodo";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reportes — Vertex" };

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

const NOVEDAD_LABEL: Record<string, string> = {
  diferencia_negativa: "Faltante",
  merma: "Merma",
  dano: "Daño",
};

export default async function ReportesPage() {
  await requirePermiso("reportes.ver");
  const { empresaId } = await requireEmpresa();
  const now = new Date();
  const { desde, hasta } = rangoMes(now.getFullYear(), now.getMonth());
  const hoy = now.toISOString().slice(0, 10);

  const [k, stock, vencidas, novedades] = await Promise.all([
    kpis(empresaId, desde, hasta),
    stockBajo(empresaId),
    cxcVencidas(empresaId, hoy),
    novedadesPorProveedor(empresaId),
  ]);

  const tarjetas = [
    { label: "Ventas del mes", v: k.ventas },
    { label: "Compras del mes", v: k.compras },
    { label: "Utilidad bruta", v: k.utilidad },
    { label: "Inventario valorizado", v: k.inventario },
    { label: "Por cobrar", v: k.porCobrar },
    { label: "Por pagar", v: k.porPagar },
  ];

  const colStock: Columna<FilaStockBajo>[] = [
    { header: "Producto", primary: true, cell: (s) => s.producto },
    { header: "Bodega", cell: (s) => s.bodega },
    { header: "Existencia", className: "text-right", cell: (s) => <span className="tabular">{Number(s.cantidad)}</span> },
    { header: "Mínimo", className: "text-right", cell: (s) => <span className="tabular">{Number(s.minimo)}</span> },
  ];
  const colVenc: Columna<FilaVencida>[] = [
    { header: "Cliente", primary: true, cell: (c) => c.cliente },
    { header: "Vencimiento", cell: (c) => <span className="tabular">{c.fechaVencimiento}</span> },
    { header: "Saldo", className: "text-right", cell: (c) => <span className="tabular font-medium text-destructive">{money(Number(c.saldo))}</span> },
  ];

  type FilaNovedad = (typeof novedades)[number];
  const colNovedades: Columna<FilaNovedad>[] = [
    { header: "Proveedor", primary: true, cell: (n) => n.proveedor },
    { header: "Novedad", cell: (n) => NOVEDAD_LABEL[n.tipo] ?? n.tipo },
    { header: "#", className: "text-right", cell: (n) => <span className="tabular">{n.novedades}</span> },
    { header: "Cantidad", className: "text-right", cell: (n) => <span className="tabular">{Number(n.cantidad).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Reportes" description={`Indicadores del periodo ${desde} a ${hasta}.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="tabular text-2xl font-semibold">{money(t.v)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">Productos con stock bajo</h3>
        {stock.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Ningún producto bajo el mínimo.</p>
        ) : (
          <ResponsiveTable items={stock} getKey={(s) => `${s.productoId}-${s.bodega}`} columns={colStock} />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">Cartera vencida</h3>
        {vencidas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Sin cuentas por cobrar vencidas.</p>
        ) : (
          <ResponsiveTable items={vencidas} getKey={(c) => c.id} columns={colVenc} />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">Novedades por proveedor (calidad)</h3>
        {novedades.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Sin novedades de proveedores.</p>
        ) : (
          <ResponsiveTable
            items={novedades}
            getKey={(n) => `${n.proveedorId}-${n.tipo}`}
            columns={colNovedades}
          />
        )}
      </div>
    </div>
  );
}
