import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarCuentasPorCobrar } from "@/lib/services/cartera";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { estadoCartera } from "@/lib/domain/cartera";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { AbonoButton } from "@/components/abono-button";
import { registrarRecaudoAction } from "./actions";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { HandCoins } from "lucide-react";

export const metadata: Metadata = { title: "Cuentas por cobrar — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarCuentasPorCobrar>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");
const VARIANTE = { pagada: "default", vencida: "destructive", pendiente: "secondary" } as const;

export default async function CuentasCobrarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("cuentas_cobrar.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const [todos, cuentasDestino] = await Promise.all([
    listarCuentasPorCobrar(empresaId),
    cuentasPropiasActivas(empresaId),
  ]);
  const hoy = new Date().toISOString().slice(0, 10);
  const puedeRecaudar = puede(sesion.rol, "recaudos.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => f.cliente,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Cliente", primary: true, cell: (f) => f.cliente },
    {
      header: "Vencimiento",
      cell: (f) => {
        const est = estadoCartera(Number(f.cuenta.saldoPendiente), f.cuenta.fechaVencimiento, hoy);
        return (
          <div className="flex items-center gap-2">
            <span className="tabular">{f.cuenta.fechaVencimiento}</span>
            <Badge variant={VARIANTE[est]} className="font-normal capitalize">{est}</Badge>
          </div>
        );
      },
    },
    { header: "Valor", className: "text-right", cell: (f) => <span className="tabular">{money(f.cuenta.valorTotal)}</span> },
    { header: "Saldo", className: "text-right", cell: (f) => <span className="tabular font-medium">{money(f.cuenta.saldoPendiente)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Cuentas por cobrar" description="Saldos pendientes de clientes." />
      <ListaFiltrable
        base="/cuentas-cobrar"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.cuenta.id}
        columns={columnas}
        searchPlaceholder="Buscar por cliente…"
        hayDatos={todos.length > 0}
        vacio={{ icon: HandCoins, titulo: "Sin cuentas por cobrar", texto: "Se generan al facturar ventas a crédito." }}
        actions={
          puedeRecaudar
            ? (f) =>
                Number(f.cuenta.saldoPendiente) > 0 ? (
                  <AbonoButton
                    cuentaId={f.cuenta.id}
                    saldo={Number(f.cuenta.saldoPendiente)}
                    hoy={hoy}
                    triggerLabel="Recaudar"
                    modalTitulo={`Recaudo de ${f.cliente}`}
                    confirmarLabel="Registrar recaudo"
                    action={registrarRecaudoAction}
                    cuentasDestino={cuentasDestino}
                  />
                ) : (
                  <Badge variant="default" className="font-normal">Pagada</Badge>
                )
            : undefined
        }
      />
    </div>
  );
}
