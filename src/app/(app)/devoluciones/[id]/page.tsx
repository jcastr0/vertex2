import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerDevolucion } from "@/lib/services/devoluciones";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Undo2 } from "lucide-react";

export const metadata: Metadata = { title: "Devolución — Vertex" };
const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");

export default async function DevolucionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("devoluciones.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const dev = await obtenerDevolucion(empresaId, parseId(id));
  if (!dev) notFound();

  const [cli, productos, creadoPor] = await Promise.all([
    dev.clienteId ? obtenerTercero(empresaId, dev.clienteId) : Promise.resolve(null),
    listarProductos(empresaId),
    nombreUsuario(dev.usuarioId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Devolución ${dev.numero}`} description={cli?.razonSocial ?? ""}>
        <Badge variant="outline" className="font-normal capitalize">{dev.estado}</Badge>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cli?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{dev.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Total devuelto</div><div className="font-semibold tabular">{money(dev.total)}</div></div>
          <div>
            <div className="text-xs text-muted-foreground">Factura</div>
            {dev.facturaId ? (
              <Link href={`/facturas/${dev.facturaId}`} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                ver <ArrowUpRight className="size-3" />
              </Link>
            ) : (
              <div className="text-muted-foreground">sin factura</div>
            )}
          </div>
        </CardContent>
      </Card>

      {dev.motivo && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-semibold">Motivo:</span> {dev.motivo}
        </div>
      )}

      <div className="space-y-2">
        {dev.detalles.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{prodPorId.get(d.productoId) ?? `#${d.productoId}`}</div>
              <div className="tabular text-muted-foreground">{Number(d.cantidad)} × {money(d.precioUnitario)}</div>
            </div>
            <div className="tabular font-medium">{money(d.subtotal)}</div>
          </div>
        ))}
        {dev.detalles.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <Undo2 className="size-4" /> Esta devolución no tiene líneas registradas.
          </div>
        )}
      </div>

      <CreadoPor nombre={creadoPor} fecha={dev.createdAt} />
    </div>
  );
}
