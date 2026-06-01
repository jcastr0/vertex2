import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { obtenerPedido } from "@/lib/services/pedidos";
import { obtenerTercero } from "@/lib/services/terceros";
import { obtenerBodega } from "@/lib/services/bodegas";
import { listarProductos, listarUnidadesMedida } from "@/lib/services/productos";
import { cuentaPorPagarDePedido } from "@/lib/services/cartera";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { fechaLarga } from "@/lib/fecha";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PedidoAcciones } from "./pedido-acciones";
import { RegistrarFacturaProveedor } from "../../cuentas-pagar/registrar-factura";
import { HandCoins, ArrowRight, FileText, AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "Pedido — Vertex" };

const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("pedidos.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { id } = await params;
  const pedido = await obtenerPedido(empresaId, parseId(id));
  if (!pedido) notFound();

  const [prov, bod, productos, unidades] = await Promise.all([
    obtenerTercero(empresaId, pedido.proveedorId),
    obtenerBodega(empresaId, pedido.bodegaId),
    listarProductos(empresaId),
    listarUnidadesMedida(),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const undPorId = new Map(unidades.map((u) => [u.id, u.abreviatura]));
  const cxp = await cuentaPorPagarDePedido(empresaId, pedido.id);
  const creadoPor = await nombreUsuario(pedido.usuarioCreaId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={`Pedido ${pedido.numero}`} description={prov?.razonSocial ?? ""}>
        <Badge variant={pedido.estado === "recibido" ? "default" : pedido.estado === "parcial" ? "secondary" : "outline"} className="font-normal capitalize">
          {pedido.estado}
        </Badge>
      </PageHeader>

      {/* Lo principal: cuánto cuesta este pedido */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.08] to-transparent p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total del pedido</p>
        <p className="tabular text-4xl font-bold tracking-tight">{money(pedido.total)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {prov?.razonSocial ?? "—"} · {bod?.nombre ?? "—"} · {fechaLarga(pedido.fecha)}
        </p>
      </section>

      {/* Cómo se compone el total */}
      {Number(pedido.costosAdicionales) > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Cómo se compone el total</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Productos (subtotal)</span>
              <span className="tabular">{money(pedido.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">+ Costos adicionales (flete, etc.)</span>
              <span className="tabular text-primary">+{money(pedido.costosAdicionales)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold">
              <span>= Total</span>
              <span className="tabular">{money(pedido.total)}</span>
            </div>
          </div>
        </section>
      )}

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

      {cxp && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HandCoins className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{cxp.saldo > 0 ? "Le debes a este proveedor por este pedido" : "Pagado"}</p>
            <p className="tabular text-lg font-bold tracking-tight">
              {cxp.saldo > 0 ? money(String(cxp.saldo)) : money(String(cxp.total))}
            </p>
            {cxp.facturaRegistrada ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5" /> Factura {cxp.numero} · {cxp.esElectronica ? "electrónica" : "normal"} · vence {cxp.vence}
              </p>
            ) : (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="size-3.5" /> Falta registrar la factura del proveedor
              </p>
            )}
          </div>
          {puede(permisos, "pagos_proveedor.crear") && (
            cxp.facturaRegistrada ? (
              cxp.saldo > 0 && (
                <Link href="/cuentas-pagar" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Ir a pagar <ArrowRight className="size-4" />
                </Link>
              )
            ) : (
              <RegistrarFacturaProveedor
                cxpId={cxp.id}
                numeroSugerido={cxp.numero}
                vencimientoSugerido={cxp.vence}
                hoy={cxp.fecha}
                feSugerida={prov?.requiereFacturaElectronica ?? false}
                triggerLabel="Registrar factura del proveedor"
                variant="default"
              />
            )
          )}
        </div>
      )}

      {puede(permisos, "pedidos.editar") && (
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

      <CreadoPor nombre={creadoPor} fecha={pedido.createdAt} />
    </div>
  );
}
