import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { obtenerTraslado } from "@/lib/services/traslados";
import { obtenerBodega } from "@/lib/services/bodegas";
import { listarProductos } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrasladoAcciones } from "./traslado-acciones";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Traslado — Vertex" };

export default async function TrasladoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("traslados.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { id } = await params;
  const traslado = await obtenerTraslado(empresaId, parseId(id));
  if (!traslado) notFound();

  const [origen, destino, productos] = await Promise.all([
    obtenerBodega(empresaId, traslado.bodegaOrigenId),
    obtenerBodega(empresaId, traslado.bodegaDestinoId),
    listarProductos(empresaId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Traslado ${traslado.numero}`}>
        <Badge className="font-normal capitalize">{traslado.estado}</Badge>
      </PageHeader>

      <Card>
        <CardContent className="flex items-center gap-3 pt-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Origen</div>
            <div className="font-medium">{origen?.nombre ?? "—"}</div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Destino</div>
            <div className="font-medium">{destino?.nombre ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {traslado.detalles.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <span className="font-medium">{prodPorId.get(d.productoId) ?? `#${d.productoId}`}</span>
            <span className="tabular text-muted-foreground">
              {Number(d.cantidad)}
              {Number(d.cantidadRecibida) > 0 && <span className="ml-2 text-primary">· recibido {Number(d.cantidadRecibida)}</span>}
            </span>
          </div>
        ))}
      </div>

      {traslado.observaciones && <p className="text-sm text-muted-foreground">{traslado.observaciones}</p>}

      {puede(permisos, "traslados.editar") && (
        <TrasladoAcciones id={traslado.id} estado={traslado.estado} />
      )}
    </div>
  );
}
