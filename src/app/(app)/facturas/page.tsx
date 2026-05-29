import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarFacturas } from "@/lib/services/facturas";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from "lucide-react";

export const metadata: Metadata = { title: "Facturas — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarFacturas>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("facturas.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarFacturas(empresaId);
  const puedeCrear = puede(sesion.rol, "facturas.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.factura.numero} ${f.cliente} ${f.factura.tipoVenta}`,
  });

  const columnas: Columna<Fila>[] = [
    {
      header: "Número",
      primary: true,
      cell: (f) => (
        <Link href={`/facturas/${f.factura.id}`} className="tabular font-medium text-primary hover:underline">
          {f.factura.numero}
        </Link>
      ),
    },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => f.factura.fecha },
    {
      header: "Tipo",
      cell: (f) => (
        <Badge variant={f.factura.tipoVenta === "credito" ? "secondary" : "outline"} className="font-normal capitalize">
          {f.factura.tipoVenta}
        </Badge>
      ),
    },
    { header: "Total", className: "text-right", cell: (f) => <span className="tabular">{money(f.factura.total)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Facturas" description="Ventas registradas.">
        {puedeCrear && (
          <Link href="/facturas/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Vender
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/facturas"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.factura.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o cliente…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Receipt, titulo: "Aún no hay ventas", texto: "Toca “Vender” para registrar la primera." }}
      />
    </div>
  );
}
