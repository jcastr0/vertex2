import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { obtenerFactura } from "@/lib/services/facturas";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { cuentaPorCobrarDeFactura } from "@/lib/services/cartera";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { abonarFacturaAction } from "../actions";
import { AnularButton } from "../anular-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AbonoButton } from "@/components/abono-button";
import { PrintButton } from "@/components/print-button";
import { ReciboPrint } from "@/components/recibo/recibo-print";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AlertTriangle, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Factura — Vertex" };

const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");

export default async function FacturaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("facturas.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { id } = await params;
  const factura = await obtenerFactura(empresaId, parseId(id));
  if (!factura) notFound();

  const [cli, productos, cxc, cuentasDestino] = await Promise.all([
    obtenerTercero(empresaId, factura.clienteId),
    listarProductos(empresaId),
    cuentaPorCobrarDeFactura(empresaId, factura.id),
    cuentasPropiasActivas(empresaId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const hoy = hoyColombia();
  const saldo = cxc?.saldo ?? 0;
  const puedeCobrar = puede(permisos, "recaudos.crear");
  const puedeAnular = puede(permisos, "facturas.eliminar");

  const [emp] = await db.select({ nombre: empresas.nombre, nit: empresas.nit }).from(empresas).where(eq(empresas.id, empresaId));
  const datosRecibo = {
    empresa: emp?.nombre ?? "Vertex", nit: emp?.nit ?? "",
    numero: factura.numero, fecha: factura.fecha, cliente: cli?.razonSocial ?? "—",
    lineas: factura.detalles.map((d) => ({ producto: prodPorId.get(d.productoId) ?? `#${d.productoId}`, cantidad: Number(d.cantidad), precio: Number(d.precioUnitario), subtotal: Number(d.subtotal) })),
    total: Number(factura.total), formaPago: factura.tipoVenta === "contado" ? (factura.metodoPago ?? "contado") : "crédito",
    anulada: factura.estado === "anulada",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Factura ${factura.numero}`} description={cli?.razonSocial ?? ""}>
        <div className="flex flex-wrap items-center gap-2">
          {factura.esElectronica && (
            <Badge variant="secondary" className="font-normal"><FileText className="mr-1 size-3" /> Electrónica</Badge>
          )}
          {factura.estado === "anulada" ? (
            <Badge variant="destructive" className="font-normal">Anulada</Badge>
          ) : (
            <Badge variant={factura.tipoVenta === "credito" ? "secondary" : "outline"} className="font-normal capitalize">
              {factura.tipoVenta}
            </Badge>
          )}
          <PrintButton />
          {puedeCobrar && saldo > 0 && cxc && factura.estado !== "anulada" && (
            <AbonoButton
              cuentaId={cxc.id}
              saldo={saldo}
              hoy={hoy}
              triggerLabel="Cobrar esta factura"
              modalTitulo={`Cobrar factura ${factura.numero}`}
              confirmarLabel="Registrar cobro"
              action={abonarFacturaAction.bind(null, cxc.id)}
              cuentasDestino={cuentasDestino.map((c) => ({ id: c.id, nombre: c.nombre }))}
            />
          )}
          {factura.estado === "emitida" && puedeAnular && <AnularButton facturaId={factura.id} />}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cli?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{factura.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold tabular">{money(factura.total)}</div></div>
          {factura.tipoVenta === "credito" ? (
            <div>
              <div className="text-xs text-muted-foreground">Saldo</div>
              <div className={`font-semibold tabular ${saldo > 0 ? "text-destructive" : "text-primary"}`}>
                {saldo > 0 ? money(saldo) : "Pagada"}
              </div>
            </div>
          ) : (
            <div><div className="text-xs text-muted-foreground">Pago</div><div className="font-medium capitalize">{factura.metodoPago ?? "contado"}</div></div>
          )}
        </CardContent>
      </Card>

      {factura.estado === "anulada" && factura.motivoAnulacion && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-semibold">Motivo de anulación:</span> {factura.motivoAnulacion}
        </div>
      )}

      <div className="space-y-2">
        {factura.detalles.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{prodPorId.get(d.productoId) ?? `#${d.productoId}`}</div>
              <div className="tabular text-muted-foreground">
                {Number(d.cantidad)} × {money(d.precioUnitario)}
                {d.esPrecioBajoCosto && (
                  <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                    <AlertTriangle className="size-3" /> bajo costo
                  </span>
                )}
              </div>
            </div>
            <div className="tabular font-medium">{money(d.subtotal)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold print:hidden">Recibo</h3>
        <ReciboPrint datos={datosRecibo} />
      </div>
    </div>
  );
}
