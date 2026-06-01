import type { Metadata } from "next";
import Link from "next/link";
import { fechaHora, fechaEnColombia } from "@/lib/fecha";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { kardexProducto } from "@/lib/services/inventario";
import { obtenerProducto } from "@/lib/services/productos";
import { origenDocumento } from "@/lib/domain/kardex";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, PackageSearch } from "lucide-react";
import type { MovimientoKardex } from "@/lib/services/inventario";

export const metadata: Metadata = { title: "Kardex — Vertex" };

const PAGE_SIZE = 20;
const num = (s: string) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (s: string | null) => (s ? "$" + Number(s).toLocaleString("es-CO") : "—");
const ENTRADAS = ["entrada", "traslado_entrada", "saldo_inicial"];

export default async function KardexPage({
  params,
  searchParams,
}: {
  params: Promise<{ productoId: string }>;
  searchParams: Promise<{ q?: string; page?: string; flujo?: string; desde?: string; hasta?: string }>;
}) {
  await requirePermiso("inventario.ver");
  const { empresaId } = await requireEmpresa();
  const { productoId } = await params;
  const { q = "", page: pageRaw, flujo, desde, hasta } = await searchParams;
  const producto = await obtenerProducto(empresaId, parseId(productoId));
  if (!producto) notFound();

  const esEntrada = (m: MovimientoKardex) => ENTRADAS.includes(m.tipo) || (m.tipo === "ajuste" && Number(m.cantidad) > 0);
  const filtros = [
    { key: "flujo", label: "Movimiento", tipo: "select" as const, opciones: [{ value: "entradas", label: "Entradas" }, { value: "salidas", label: "Salidas" }] },
    { key: "desde", label: "Desde", tipo: "fecha" as const },
    { key: "hasta", label: "Hasta", tipo: "fecha" as const },
  ];
  const todos = await kardexProducto(empresaId, producto.id);
  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (m) => `${m.tipo} ${m.referencia ?? ""} ${m.bodegaNombre}`,
    filtro: (m) => {
      if (flujo && (flujo === "entradas" ? !esEntrada(m) : esEntrada(m))) return false;
      const f = fechaEnColombia(m.fecha); // fecha del movimiento en Colombia (YYYY-MM-DD)
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    },
  });

  const columnas: Columna<MovimientoKardex>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{fechaHora(m.fecha)}</span> },
    {
      header: "Tipo",
      cell: (m) => (
        <Badge variant={ENTRADAS.includes(m.tipo) ? "default" : "secondary"} className="font-normal capitalize">
          {m.tipo.replace("_", " ")}
        </Badge>
      ),
    },
    { header: "Bodega", cell: (m) => m.bodegaNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
    { header: "Costo unit.", className: "text-right", cell: (m) => <span className="tabular">{money(m.costoUnitario)}</span> },
    {
      header: "Origen",
      cell: (m) => {
        const o = origenDocumento(m);
        return o ? (
          <Link href={o.href} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            {o.label} <ArrowUpRight className="size-3" />
          </Link>
        ) : (
          <span className="text-muted-foreground">{m.referencia ?? "—"}</span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={`Kardex — ${producto.nombre}`} description={`SKU ${producto.sku} · ${todos.length} movimiento${todos.length !== 1 ? "s" : ""}`} />
      <ListaFiltrable
        base={`/inventario/${producto.id}`}
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        columns={columnas}
        getKey={(m) => m.id}
        filtros={filtros}
        searchPlaceholder="Buscar por tipo, documento o bodega…"
        hayDatos={todos.length > 0}
        vacio={{ icon: PackageSearch, titulo: "Sin movimientos", texto: "Este producto aún no tiene entradas ni salidas registradas." }}
      />
    </div>
  );
}
