import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { obtenerCuentaPropia, extractoCuenta, cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { MovimientoButton } from "../movimiento-button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Extracto — Vertex" };

const money = (n: number) => "$" + n.toLocaleString("es-CO");

const ORIGEN_LABEL: Record<string, string> = {
  saldo_inicial: "Saldo inicial",
  pago_proveedor: "Pago a proveedor",
  recaudo_cliente: "Recaudo",
  traslado: "Traslado",
  comision: "Comisión",
  ajuste: "Ajuste",
  consignacion: "Consignación",
  retiro: "Retiro",
};

export default async function ExtractoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("tesoreria.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { id } = await params;
  const cuentaId = Number(id);
  const cuenta = await obtenerCuentaPropia(empresaId, cuentaId);
  if (!cuenta) notFound();
  const movimientos = await extractoCuenta(empresaId, cuentaId);
  const saldoActual = movimientos.length ? movimientos[movimientos.length - 1].saldo : 0;
  const otras = (await cuentasPropiasActivas(empresaId))
    .filter((c) => c.id !== cuentaId)
    .map((c) => ({ id: c.id, nombre: c.nombre }));
  const hoy = new Date().toISOString().slice(0, 10);
  const puedeCrear = puede(permisos, "tesoreria.crear");

  type Mov = (typeof movimientos)[number];
  const columnas: Columna<Mov>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{m.fecha}</span> },
    { header: "Concepto", cell: (m) => ORIGEN_LABEL[m.origen] ?? m.origen },
    { header: "Detalle", cell: (m) => m.descripcion ?? "—" },
    {
      header: "Entrada",
      className: "text-right",
      cell: (m) =>
        m.tipo === "entrada" ? (
          <span className="tabular text-green-600">{money(m.valor)}</span>
        ) : (
          "—"
        ),
    },
    {
      header: "Salida",
      className: "text-right",
      cell: (m) =>
        m.tipo === "salida" ? (
          <span className="tabular text-destructive">{money(m.valor)}</span>
        ) : (
          "—"
        ),
    },
    {
      header: "Saldo",
      className: "text-right",
      cell: (m) => <span className="tabular font-medium">{money(m.saldo)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/tesoreria"
        className={buttonVariants({ variant: "ghost", size: "sm" }) + " mb-2"}
      >
        <ArrowLeft className="size-4" /> Tesorería
      </Link>
      <PageHeader
        title={cuenta.nombre}
        description={`${cuenta.banco ?? "Caja"} · Saldo actual: ${money(saldoActual)}`}
      >
        {puedeCrear && (
          <MovimientoButton cuentaId={cuentaId} hoy={hoy} otrasCuentas={otras} />
        )}
      </PageHeader>
      {movimientos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
      ) : (
        <ResponsiveTable
          items={[...movimientos].reverse()}
          getKey={(m) => m.id}
          columns={columnas}
        />
      )}
    </div>
  );
}
