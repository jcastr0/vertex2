import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerFactura } from "@/lib/services/facturas";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Factura — Vertex" };

const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function FacturaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("facturas.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const factura = await obtenerFactura(empresaId, Number(id));
  if (!factura) notFound();

  const [cli, productos] = await Promise.all([
    obtenerTercero(empresaId, factura.clienteId),
    listarProductos(empresaId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Factura ${factura.numero}`} description={cli?.razonSocial ?? ""}>
        <Badge variant={factura.tipoVenta === "credito" ? "secondary" : "outline"} className="font-normal capitalize">
          {factura.tipoVenta}
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cli?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{factura.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Estado</div><div className="font-medium capitalize">{factura.estado}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold tabular">{money(factura.total)}</div></div>
        </CardContent>
      </Card>

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
    </div>
  );
}
