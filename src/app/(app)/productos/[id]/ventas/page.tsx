import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerProducto } from "@/lib/services/productos";
import { ventasDeProducto, type VentaDeProducto } from "@/lib/services/fichas";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Receipt } from "lucide-react";
import { fechaCorta } from "@/lib/fecha";

export const metadata: Metadata = { title: "Ventas del producto — Vertex" };
const PAGE_SIZE = 15;
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function VentasProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; desde?: string; hasta?: string }>;
}) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const { q = "", page: pageRaw, desde, hasta } = await searchParams;
  const productoId = parseId(id);
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) notFound();

  const filtros = [
    { key: "desde", label: "Desde", tipo: "fecha" as const },
    { key: "hasta", label: "Hasta", tipo: "fecha" as const },
  ];
  const todas = await ventasDeProducto(empresaId, productoId);
  const totalCant = todas.reduce((s, v) => s + v.cantidad, 0);
  const totalMonto = todas.reduce((s, v) => s + v.subtotal, 0);
  const { items, total, page } = filtrarPaginar(todas, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (v) => `${v.numero} ${v.cliente}`,
    filtro: (v) => (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta),
  });

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
      <PageHeader title="Ventas del producto" description={`${num(totalCant)} unidades · ${money(totalMonto)} en ${todas.length} factura${todas.length !== 1 ? "s" : ""}`} />
      <ListaFiltrable
        base={`/productos/${productoId}/ventas`}
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        columns={cols}
        getKey={(v) => v.facturaId}
        rowHref={(v) => `/facturas/${v.facturaId}`}
        filtros={filtros}
        searchPlaceholder="Buscar por factura o cliente…"
        hayDatos={todas.length > 0}
        vacio={{ icon: Receipt, titulo: "Este producto aún no se ha vendido", texto: "Cuando lo vendas, las facturas aparecerán aquí." }}
      />
    </div>
  );
}
