import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarPedidos } from "@/lib/services/pedidos";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart } from "lucide-react";

export const metadata: Metadata = { title: "Pedidos — Vertex" };

type Fila = Awaited<ReturnType<typeof listarPedidos>>[number];

const VARIANTE: Record<string, "default" | "secondary" | "outline"> = {
  borrador: "outline",
  confirmado: "secondary",
  recibido: "default",
  parcial: "secondary",
  cancelado: "outline",
};
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function PedidosPage() {
  const sesion = await requirePermiso("pedidos.ver");
  const { empresaId } = await requireEmpresa();
  const filas = await listarPedidos(empresaId);
  const puedeCrear = puede(sesion.rol, "pedidos.crear");

  const columnas: Columna<Fila>[] = [
    {
      header: "Número",
      primary: true,
      cell: (f) => (
        <Link href={`/pedidos/${f.pedido.id}`} className="tabular font-medium text-primary hover:underline">
          {f.pedido.numero}
        </Link>
      ),
    },
    { header: "Proveedor", cell: (f) => f.proveedor },
    { header: "Fecha", cell: (f) => f.pedido.fecha },
    {
      header: "Estado",
      cell: (f) => (
        <Badge variant={VARIANTE[f.pedido.estado] ?? "outline"} className="font-normal capitalize">
          {f.pedido.estado}
        </Badge>
      ),
    },
    { header: "Total", className: "text-right", cell: (f) => <span className="tabular">{money(f.pedido.total)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Pedidos a proveedores" description="Órdenes de compra e ingreso a inventario.">
        {puedeCrear && (
          <Link href="/pedidos/nuevo" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo pedido
          </Link>
        )}
      </PageHeader>

      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ShoppingCart className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay pedidos</p>
          <p className="text-sm text-muted-foreground">Crea un pedido para comprar a un proveedor.</p>
        </div>
      ) : (
        <ResponsiveTable items={filas} getKey={(f) => f.pedido.id} columns={columnas} />
      )}
    </div>
  );
}
