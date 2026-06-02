import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarCotizaciones } from "@/lib/services/cotizaciones";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Cotizaciones — Vertex" };
const PAGE_SIZE = 10;
type Fila = Awaited<ReturnType<typeof listarCotizaciones>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");
const VARIANTE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "secondary",
  facturada: "default",
  anulada: "destructive",
};

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("cotizaciones.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarCotizaciones(empresaId);
  const puedeCrear = puede(permisos, "cotizaciones.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.cotizacion.numero} ${f.cliente} ${f.cotizacion.estado}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.cotizacion.numero}</span> },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => <span className="tabular">{f.cotizacion.fecha}</span> },
    { header: "Estado", cell: (f) => <Badge variant={VARIANTE[f.cotizacion.estado] ?? "outline"} className="font-normal capitalize">{f.cotizacion.estado}</Badge> },
    { header: "Total", className: "text-right", cell: (f) => <span className="tabular">{money(f.cotizacion.total)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Cotizaciones" description="Pedidos de clientes: arma una cotización y conviértela en factura.">
        {puedeCrear && (
          <Link href="/cotizaciones/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva cotización
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/cotizaciones"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.cotizacion.id}
        rowHref={(f) => `/cotizaciones/${f.cotizacion.id}`}
        columns={columnas}
        searchPlaceholder="Buscar por número, cliente o estado…"
        hayDatos={todos.length > 0}
        vacio={{ icon: FileText, titulo: "Aún no hay cotizaciones", texto: "Crea una cotización con lo que pidió un cliente." }}
      />
    </div>
  );
}
