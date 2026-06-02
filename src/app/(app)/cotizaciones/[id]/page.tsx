import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { obtenerCotizacion } from "@/lib/services/cotizaciones";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AnularCotizacionButton } from "../anular-cotizacion-button";
import { ArrowUpRight, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Cotización — Vertex" };
const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");
const num = (s: string | number) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("cotizaciones.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { id } = await params;
  const cot = await obtenerCotizacion(empresaId, parseId(id));
  if (!cot) notFound();

  const [cli, productos, creadoPor] = await Promise.all([
    obtenerTercero(empresaId, cot.clienteId),
    listarProductos(empresaId),
    nombreUsuario(cot.usuarioId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const puedeFacturarUI = puede(permisos, "facturas.crear") && cot.estado === "pendiente";
  const puedeAnularUI = puede(permisos, "cotizaciones.editar") && cot.estado === "pendiente";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Cotización ${cot.numero}`} description={cli?.razonSocial ?? ""}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={cot.estado === "facturada" ? "default" : cot.estado === "anulada" ? "destructive" : "secondary"} className="font-normal capitalize">{cot.estado}</Badge>
          {puedeFacturarUI && (
            <Link href={`/cotizaciones/${cot.id}/facturar`} className={buttonVariants({ size: "sm" })}>Facturar</Link>
          )}
          {puedeAnularUI && <AnularCotizacionButton cotizacionId={cot.id} />}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cli?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{cot.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold tabular">{money(cot.total)}</div></div>
          <div>
            <div className="text-xs text-muted-foreground">Factura</div>
            {cot.facturaId ? (
              <Link href={`/facturas/${cot.facturaId}`} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">ver <ArrowUpRight className="size-3" /></Link>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </div>
        </CardContent>
      </Card>

      {cot.estado === "anulada" && cot.motivoAnulacion && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-semibold">Motivo de anulación:</span> {cot.motivoAnulacion}
        </div>
      )}

      <div className="space-y-2">
        {cot.detalles.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{prodPorId.get(d.productoId) ?? `#${d.productoId}`}</div>
              <div className="tabular text-muted-foreground">{num(d.cantidad)} × {money(d.precioUnitario)}</div>
            </div>
            <div className="tabular font-medium">{money(d.subtotal)}</div>
          </div>
        ))}
        {cot.detalles.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <FileText className="size-4" /> Esta cotización no tiene líneas.
          </div>
        )}
      </div>

      <CreadoPor nombre={creadoPor} fecha={cot.createdAt} />
    </div>
  );
}
