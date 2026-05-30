import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarPagos } from "@/lib/services/cartera";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Wallet } from "lucide-react";

export const metadata: Metadata = { title: "Pagos a proveedor — Vertex" };
const PAGE_SIZE = 10;
type Fila = Awaited<ReturnType<typeof listarPagos>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");
const METODO: Record<string, string> = Object.fromEntries(METODOS_PAGO.map((m) => [m.value, m.label]));

export default async function PagosProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("pagos_proveedor.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarPagos(empresaId);

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.pago.numero} ${f.proveedor}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.pago.numero}</span> },
    { header: "Proveedor", cell: (f) => f.proveedor },
    { header: "Beneficiario", cell: (f) => f.pago.beneficiarioNombre ?? f.proveedor },
    { header: "Fecha", cell: (f) => f.pago.fecha },
    { header: "Origen", mobileHidden: true, cell: (f) => f.cuentaOrigen ?? "—" },
    { header: "Método", cell: (f) => METODO[f.pago.metodoPago] ?? f.pago.metodoPago },
    { header: "Valor", className: "text-right", cell: (f) => <span className="tabular font-medium">{money(f.pago.valor)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Pagos a proveedor" description="Historial de pagos realizados." />
      <ListaFiltrable
        base="/pagos-proveedor"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.pago.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o proveedor…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Wallet, titulo: "Aún no hay pagos", texto: "Registra pagos desde Cuentas por pagar." }}
      />
    </div>
  );
}
