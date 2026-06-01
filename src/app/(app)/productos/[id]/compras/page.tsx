import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerProducto } from "@/lib/services/productos";
import { comprasDeProducto, type CompraDeProducto } from "@/lib/services/fichas";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { fechaCorta } from "@/lib/fecha";

export const metadata: Metadata = { title: "Compras del producto — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function ComprasProductoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const productoId = parseId(id);
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) notFound();
  const compras = await comprasDeProducto(empresaId, productoId);
  const totalCant = compras.reduce((s, c) => s + c.cantidad, 0);
  const totalRecibida = compras.reduce((s, c) => s + c.recibida, 0);

  const cols: Columna<CompraDeProducto>[] = [
    { header: "Pedido", primary: true, cell: (c) => <span className="tabular font-medium">{c.numero}</span> },
    { header: "Fecha", cell: (c) => <span className="tabular">{fechaCorta(c.fecha)}</span> },
    { header: "Proveedor", cell: (c) => c.proveedor },
    { header: "Pedido", className: "text-right", cell: (c) => <span className="tabular">{num(c.cantidad)}</span> },
    { header: "Recibido", className: "text-right", cell: (c) => <span className="tabular">{num(c.recibida)}</span> },
    { header: "Subtotal", className: "text-right", cell: (c) => <span className="tabular">{money(c.subtotal)}</span> },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/productos/${productoId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" /> {producto.nombre}
      </Link>
      <PageHeader title="Compras del producto" description={`${num(totalCant)} pedido · ${num(totalRecibida)} recibido en ${compras.length} pedido${compras.length !== 1 ? "s" : ""}`} />
      {compras.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">Este producto aún no se ha comprado en pedidos.</div>
      ) : (
        <ResponsiveTable items={compras} getKey={(c) => c.pedidoId} columns={cols} rowHref={(c) => `/pedidos/${c.pedidoId}`} />
      )}
    </div>
  );
}
