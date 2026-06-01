import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerProducto } from "@/lib/services/productos";
import { comprasDeProducto, type CompraDeProducto } from "@/lib/services/fichas";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { fechaCorta } from "@/lib/fecha";

export const metadata: Metadata = { title: "Compras del producto — Vertex" };
const PAGE_SIZE = 15;
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function ComprasProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const { q = "", page: pageRaw } = await searchParams;
  const productoId = parseId(id);
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) notFound();

  const todas = await comprasDeProducto(empresaId, productoId);
  const totalCant = todas.reduce((s, c) => s + c.cantidad, 0);
  const totalRecibida = todas.reduce((s, c) => s + c.recibida, 0);
  const { items, total, page } = filtrarPaginar(todas, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (c) => `${c.numero} ${c.proveedor}`,
  });

  const cols: Columna<CompraDeProducto>[] = [
    { header: "Pedido", primary: true, cell: (c) => <span className="tabular font-medium">{c.numero}</span> },
    { header: "Fecha", cell: (c) => <span className="tabular">{fechaCorta(c.fecha)}</span> },
    { header: "Proveedor", cell: (c) => c.proveedor },
    { header: "Cant. pedida", className: "text-right", cell: (c) => <span className="tabular">{num(c.cantidad)}</span> },
    { header: "Recibida", className: "text-right", cell: (c) => <span className="tabular">{num(c.recibida)}</span> },
    { header: "Subtotal", className: "text-right", cell: (c) => <span className="tabular">{money(c.subtotal)}</span> },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/productos/${productoId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" /> {producto.nombre}
      </Link>
      <PageHeader title="Compras del producto" description={`${num(totalCant)} unidades en ${todas.length} pedido${todas.length !== 1 ? "s" : ""} · recibidas ${num(totalRecibida)}`} />
      <ListaFiltrable
        base={`/productos/${productoId}/compras`}
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        columns={cols}
        getKey={(c) => c.pedidoId}
        rowHref={(c) => `/pedidos/${c.pedidoId}`}
        searchPlaceholder="Buscar por pedido o proveedor…"
        hayDatos={todas.length > 0}
        vacio={{ icon: ShoppingCart, titulo: "Este producto aún no se ha comprado", texto: "Cuando lo pidas a un proveedor, los pedidos aparecerán aquí." }}
      />
    </div>
  );
}
