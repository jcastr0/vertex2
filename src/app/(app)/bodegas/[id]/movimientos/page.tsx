import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerBodega } from "@/lib/services/bodegas";
import { movimientosDeBodega, type FichaBodegaMovimiento } from "@/lib/services/fichas";
import { origenDocumento } from "@/lib/domain/kardex";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { fechaInstante } from "@/lib/fecha";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, Route } from "lucide-react";

export const metadata: Metadata = { title: "Movimientos de la bodega — Vertex" };
const PAGE_SIZE = 20;
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const ENTRADAS = ["entrada", "traslado_entrada", "saldo_inicial"];

export default async function MovimientosBodegaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("bodegas.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const { q = "", page: pageRaw } = await searchParams;
  const bodegaId = parseId(id);
  const bodega = await obtenerBodega(empresaId, bodegaId);
  if (!bodega) notFound();

  const todos = await movimientosDeBodega(empresaId, bodegaId);
  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (m) => `${m.tipo} ${m.productoNombre} ${m.referencia ?? ""}`,
  });

  const cols: Columna<FichaBodegaMovimiento>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{fechaInstante(m.fecha)}</span> },
    { header: "Tipo", cell: (m) => <Badge variant={ENTRADAS.includes(m.tipo) ? "default" : "secondary"} className="font-normal capitalize">{m.tipo.replace("_", " ")}</Badge> },
    { header: "Producto", cell: (m) => m.productoNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
    {
      header: "Origen",
      cell: (m) => {
        const o = origenDocumento(m);
        return o ? (
          <Link href={o.href} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            {o.label} <ArrowUpRight className="size-3" />
          </Link>
        ) : (
          <span className="text-muted-foreground">{m.referencia ?? "—"}</span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/bodegas/${bodegaId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" /> {bodega.nombre}
      </Link>
      <PageHeader title="Movimientos de la bodega" description={`${todos.length} movimiento${todos.length !== 1 ? "s" : ""} en total`} />
      <ListaFiltrable
        base={`/bodegas/${bodegaId}/movimientos`}
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        columns={cols}
        getKey={(m) => m.id}
        searchPlaceholder="Buscar por tipo, producto o documento…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Route, titulo: "Sin movimientos", texto: "Esta bodega aún no tiene entradas ni salidas." }}
      />
    </div>
  );
}
