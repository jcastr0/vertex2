import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
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
  searchParams: Promise<{ q?: string; page?: string; tipoVenta?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  await requirePermiso("facturas.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw, tipoVenta, estado, desde, hasta } = await searchParams;
  const todos = await listarFacturas(empresaId);
  const puedeCrear = puede(permisos, "facturas.crear");

  const filtros = [
    {
      key: "tipoVenta",
      label: "Tipo",
      tipo: "select" as const,
      opciones: [
        { value: "contado", label: "Contado" },
        { value: "credito", label: "Crédito" },
      ],
    },
    {
      key: "estado",
      label: "Estado",
      tipo: "select" as const,
      opciones: [
        { value: "emitida", label: "Emitida" },
        { value: "anulada", label: "Anulada" },
      ],
    },
    { key: "desde", label: "Desde", tipo: "fecha" as const },
    { key: "hasta", label: "Hasta", tipo: "fecha" as const },
  ];

  const filtro = (f: Fila) => {
    if (tipoVenta && f.factura.tipoVenta !== tipoVenta) return false;
    if (estado && f.factura.estado !== estado) return false;
    if (desde && f.factura.fecha < desde) return false;
    if (hasta && f.factura.fecha > hasta) return false;
    return true;
  };

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.factura.numero} ${f.cliente} ${f.factura.tipoVenta}`,
    filtro,
  });

  const columnas: Columna<Fila>[] = [
    {
      header: "Número",
      primary: true,
      cell: (f) => <span className="tabular font-medium">{f.factura.numero}</span>,
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
        rowHref={(f) => `/facturas/${f.factura.id}`}
        columns={columnas}
        searchPlaceholder="Buscar por número o cliente…"
        filtros={filtros}
        hayDatos={todos.length > 0}
        vacio={{ icon: Receipt, titulo: "Aún no hay ventas", texto: "Toca “Vender” para registrar la primera." }}
      />
    </div>
  );
}
