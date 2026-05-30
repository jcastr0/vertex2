import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { obtenerPedido } from "@/lib/services/pedidos";
import { obtenerTercero } from "@/lib/services/terceros";
import { obtenerBodega } from "@/lib/services/bodegas";
import { listarProductos, listarUnidadesMedida } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PedidoAcciones } from "./pedido-acciones";

export const metadata: Metadata = { title: "Pedido — Vertex" };

const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requirePermiso("pedidos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const pedido = await obtenerPedido(empresaId, Number(id));
  if (!pedido) notFound();

  const [prov, bod, productos, unidades] = await Promise.all([
    obtenerTercero(empresaId, pedido.proveedorId),
    obtenerBodega(empresaId, pedido.bodegaId),
    listarProductos(empresaId),
    listarUnidadesMedida(),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const undPorId = new Map(unidades.map((u) => [u.id, u.abreviatura]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={`Pedido ${pedido.numero}`} description={prov?.razonSocial ?? ""}>
        <Badge className="font-normal capitalize">{pedido.estado}</Badge>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Proveedor</div><div className="font-medium">{prov?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Bodega destino</div><div className="font-medium">{bod?.nombre ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{pedido.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold tabular">{money(pedido.total)}</div></div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Productos</h3>
        <div className="space-y-2">
          {pedido.detalles.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{prodPorId.get(d.productoId) ?? `#${d.productoId}`}</div>
                <div className="text-muted-foreground tabular">
                  {Number(d.cantidad)} {undPorId.get(d.unidadId) ?? ""} × {money(d.precioUnitario)}
                  {Number(d.cantidadRecibida) > 0 && (
                    <span className="ml-2 text-primary">· recibido {Number(d.cantidadRecibida)}</span>
                  )}
                </div>
              </div>
              <div className="tabular font-medium">{money(d.subtotal)}</div>
            </div>
          ))}
        </div>
      </div>

      {pedido.costos.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Costos adicionales</h3>
          <div className="space-y-2">
            {pedido.costos.map((c) => (
              <div key={c.id} className="flex justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm">
                <span className="capitalize">{c.tipo}{c.descripcion ? ` — ${c.descripcion}` : ""}</span>
                <span className="tabular">{money(c.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pedido.observaciones && (
        <p className="text-sm text-muted-foreground">{pedido.observaciones}</p>
      )}

      {puede(sesion.rol, "pedidos.editar") && (
        <PedidoAcciones
          id={pedido.id}
          estado={pedido.estado}
          lineas={pedido.detalles.map((d) => ({
            id: d.id,
            producto: prodPorId.get(d.productoId) ?? `#${d.productoId}`,
            cantidad: Number(d.cantidad),
            unidad: undPorId.get(d.unidadId) ?? "",
          }))}
        />
      )}
    </div>
  );
}
