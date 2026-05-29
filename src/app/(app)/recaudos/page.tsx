import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarRecaudos } from "@/lib/services/cartera";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { HandCoins } from "lucide-react";

export const metadata: Metadata = { title: "Recaudos — Vertex" };
const PAGE_SIZE = 10;
type Fila = Awaited<ReturnType<typeof listarRecaudos>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");
const METODO: Record<string, string> = Object.fromEntries(METODOS_PAGO.map((m) => [m.value, m.label]));

export default async function RecaudosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("recaudos.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarRecaudos(empresaId);

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.recaudo.numero} ${f.cliente}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.recaudo.numero}</span> },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => f.recaudo.fecha },
    { header: "Método", cell: (f) => METODO[f.recaudo.metodoPago] ?? f.recaudo.metodoPago },
    { header: "Valor", className: "text-right", cell: (f) => <span className="tabular font-medium">{money(f.recaudo.valor)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Recaudos de clientes" description="Historial de recaudos recibidos." />
      <ListaFiltrable
        base="/recaudos"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.recaudo.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o cliente…"
        hayDatos={todos.length > 0}
        vacio={{ icon: HandCoins, titulo: "Aún no hay recaudos", texto: "Registra recaudos desde Cuentas por cobrar." }}
      />
    </div>
  );
}
