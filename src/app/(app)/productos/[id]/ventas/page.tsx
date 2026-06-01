import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerProducto } from "@/lib/services/productos";
import { ventasDeProducto, type VentaDeProducto } from "@/lib/services/fichas";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { fechaCorta } from "@/lib/fecha";

export const metadata: Metadata = { title: "Ventas del producto — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function VentasProductoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const productoId = parseId(id);
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) notFound();
  const ventas = await ventasDeProducto(empresaId, productoId);
  const totalCant = ventas.reduce((s, v) => s + v.cantidad, 0);
  const totalMonto = ventas.reduce((s, v) => s + v.subtotal, 0);

  const cols: Columna<VentaDeProducto>[] = [
    { header: "Factura", primary: true, cell: (v) => <span className="tabular font-medium">{v.numero}</span> },
    { header: "Fecha", cell: (v) => <span className="tabular">{fechaCorta(v.fecha)}</span> },
    { header: "Cliente", cell: (v) => v.cliente },
    { header: "Cantidad", className: "text-right", cell: (v) => <span className="tabular">{num(v.cantidad)}</span> },
    { header: "Subtotal", className: "text-right", cell: (v) => <span className="tabular">{money(v.subtotal)}</span> },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/productos/${productoId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" /> {producto.nombre}
      </Link>
      <PageHeader title="Ventas del producto" description={`${num(totalCant)} unidades · ${money(totalMonto)} en ${ventas.length} factura${ventas.length !== 1 ? "s" : ""}`} />
      {ventas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">Este producto aún no se ha vendido.</div>
      ) : (
        <ResponsiveTable items={ventas} getKey={(v) => v.facturaId} columns={cols} rowHref={(v) => `/facturas/${v.facturaId}`} />
      )}
    </div>
  );
}
