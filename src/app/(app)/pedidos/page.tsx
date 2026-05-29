import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarPedidos } from "@/lib/services/pedidos";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart } from "lucide-react";

export const metadata: Metadata = { title: "Pedidos — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarPedidos>>[number];
const VARIANTE: Record<string, "default" | "secondary" | "outline"> = {
  borrador: "outline",
  confirmado: "secondary",
  recibido: "default",
  parcial: "secondary",
  cancelado: "outline",
};
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sesion = await requirePermiso("pedidos.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarPedidos(empresaId);
  const puedeCrear = puede(sesion.rol, "pedidos.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.pedido.numero} ${f.proveedor} ${f.pedido.estado}`,
  });

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

      <ListaFiltrable
        base="/pedidos"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.pedido.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o proveedor…"
        hayDatos={todos.length > 0}
        vacio={{ icon: ShoppingCart, titulo: "Aún no hay pedidos", texto: "Crea un pedido para comprar a un proveedor." }}
      />
    </div>
  );
}
