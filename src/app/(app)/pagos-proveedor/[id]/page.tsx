import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerPago } from "@/lib/services/cartera";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Pago a proveedor — Vertex" };
const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");

export default async function PagoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("pagos_proveedor.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const pago = await obtenerPago(empresaId, parseId(id));
  if (!pago) notFound();
  const creadoPor = await nombreUsuario(pago.usuarioId);
  const anulado = pago.estado !== "activo";
  const retencion = Number(pago.retencionTotal ?? 0);
  const causado = Number(pago.valor) + retencion;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Pago ${pago.numero}`} description={pago.proveedor}>
        <div className="flex items-center gap-2">
          {anulado && <Badge variant="destructive" className="font-normal capitalize">{pago.estado}</Badge>}
          <PrintButton />
        </div>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Proveedor</div><div className="font-medium">{pago.proveedor}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{pago.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Pagado</div><div className="font-semibold tabular text-primary">{money(pago.valor)}</div></div>
          <div><div className="text-xs text-muted-foreground">Método</div><div className="font-medium capitalize">{pago.metodoPago}</div></div>
          <div><div className="text-xs text-muted-foreground">Sale de</div><div className="font-medium">{pago.cuentaOrigen ?? "—"}</div></div>
          {pago.referencia && (
            <div><div className="text-xs text-muted-foreground">Referencia</div><div className="font-medium tabular">{pago.referencia}</div></div>
          )}
        </CardContent>
      </Card>

      {(pago.beneficiarioNombre || pago.beneficiarioBanco) && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beneficiario del pago</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pago.beneficiarioNombre && <div><div className="text-xs text-muted-foreground">Titular</div><div className="font-medium">{pago.beneficiarioNombre}</div></div>}
            {pago.beneficiarioNit && <div><div className="text-xs text-muted-foreground">NIT/CC</div><div className="font-medium tabular">{pago.beneficiarioNit}</div></div>}
            {pago.beneficiarioBanco && <div><div className="text-xs text-muted-foreground">Banco</div><div className="font-medium">{pago.beneficiarioBanco}</div></div>}
            {pago.beneficiarioCuenta && <div><div className="text-xs text-muted-foreground">Cuenta</div><div className="font-medium tabular">{pago.beneficiarioCuenta}</div></div>}
          </div>
        </div>
      )}

      {pago.retenciones.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Retenciones aplicadas</div>
          {pago.retenciones.map((r) => (
            <div key={r.ret.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{r.nombre ?? "Retención"}</div>
                <div className="tabular text-muted-foreground">{Number(r.ret.porcentaje)}% sobre {money(r.ret.base)}</div>
              </div>
              <div className="tabular font-medium text-destructive">−{money(r.ret.valor)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Causado (pagado + retención)</span>
            <span className="tabular font-semibold">{money(causado)}</span>
          </div>
        </div>
      )}

      {pago.observaciones && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-semibold">Observaciones:</span> {pago.observaciones}
        </div>
      )}

      <CreadoPor nombre={creadoPor} fecha={pago.createdAt} />
    </div>
  );
}
