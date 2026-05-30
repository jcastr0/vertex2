import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarCuentasPorPagar } from "@/lib/services/cartera";
import { retencionesActivas } from "@/lib/services/retenciones";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { beneficiariosActivos } from "@/lib/services/beneficiarios";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { estadoCartera } from "@/lib/domain/cartera";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { PagoProveedorButton } from "@/components/pago-proveedor-button";
import { registrarPagoAction } from "./actions";
import { Wallet } from "lucide-react";

export const metadata: Metadata = { title: "Cuentas por pagar — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarCuentasPorPagar>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");
const VARIANTE = { pagada: "default", vencida: "destructive", pendiente: "secondary" } as const;

export default async function CuentasPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  const sesion = await requirePermiso("cuentas_pagar.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw, estado, desde, hasta } = await searchParams;
  const todos = await listarCuentasPorPagar(empresaId);
  const retenciones = await retencionesActivas(empresaId);
  const hoy = new Date().toISOString().slice(0, 10);
  const puedePagar = puede(sesion.rol, "pagos_proveedor.crear");

  const filtros = [
    { key: "estado", label: "Estado", tipo: "select" as const, opciones: [{ value: "pendiente", label: "Pendiente" }, { value: "vencida", label: "Vencida" }, { value: "pagada", label: "Pagada" }] },
    { key: "desde", label: "Vence desde", tipo: "fecha" as const },
    { key: "hasta", label: "Vence hasta", tipo: "fecha" as const },
  ];

  const filtro = (f: Fila) => {
    const est = estadoCartera(Number(f.cuenta.saldoPendiente), f.cuenta.fechaVencimiento, hoy);
    if (estado && est !== estado) return false;
    if (desde && f.cuenta.fechaVencimiento < desde) return false;
    if (hasta && f.cuenta.fechaVencimiento > hasta) return false;
    return true;
  };

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.proveedor} ${f.cuenta.numeroFactura}`,
    filtro,
  });

  const cuentasOrigen = await cuentasPropiasActivas(empresaId);
  // Beneficiarios por proveedor (solo filas con saldo)
  const proveedorIds = [...new Set(items.filter((f) => Number(f.cuenta.saldoPendiente) > 0).map((f) => f.cuenta.proveedorId))];
  const benefPorProveedor = new Map<number, Awaited<ReturnType<typeof beneficiariosActivos>>>();
  await Promise.all(proveedorIds.map(async (pid) => { benefPorProveedor.set(pid, await beneficiariosActivos(empresaId, pid)); }));

  const columnas: Columna<Fila>[] = [
    { header: "Proveedor", primary: true, cell: (f) => f.proveedor },
    { header: "Factura", cell: (f) => <span className="tabular">{f.cuenta.numeroFactura}</span> },
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
    { header: "Saldo", className: "text-right", cell: (f) => <span className="tabular font-medium">{money(f.cuenta.saldoPendiente)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Cuentas por pagar" description="Saldos pendientes con proveedores." />
      <ListaFiltrable
        base="/cuentas-pagar"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.cuenta.id}
        columns={columnas}
        searchPlaceholder="Buscar por proveedor o factura…"
        filtros={filtros}
        hayDatos={todos.length > 0}
        vacio={{ icon: Wallet, titulo: "Sin cuentas por pagar", texto: "Se generan al recibir pedidos a proveedores." }}
        actions={
          puedePagar
            ? (f) =>
                Number(f.cuenta.saldoPendiente) > 0 ? (
                  <PagoProveedorButton
                    cuentaId={f.cuenta.id}
                    saldo={Number(f.cuenta.saldoPendiente)}
                    hoy={hoy}
                    proveedor={f.proveedor}
                    facturaElectronica={f.facturaElectronica ?? false}
                    retenciones={retenciones}
                    action={registrarPagoAction}
                    cuentasOrigen={cuentasOrigen}
                    beneficiarios={benefPorProveedor.get(f.cuenta.proveedorId) ?? []}
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
