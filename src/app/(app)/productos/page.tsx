import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarProductos, listarUnidadesMedida, type Producto } from "@/lib/services/productos";
import { listarCategorias } from "@/lib/services/categorias";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductoRowActions } from "./producto-row-actions";
import { Plus, Package } from "lucide-react";

export const metadata: Metadata = { title: "Productos — Vertex" };
const PAGE_SIZE = 10;

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; categoria?: string; estado?: string }>;
}) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw, categoria, estado } = await searchParams;

  const [todos, categorias, unidades] = await Promise.all([
    listarProductos(empresaId),
    listarCategorias(empresaId, "producto"),
    listarUnidadesMedida(),
  ]);
  const catPorId = new Map(categorias.map((c) => [c.id, c.nombre]));
  const undPorId = new Map(unidades.map((u) => [u.id, u.abreviatura]));

  const filtros = [
    { key: "categoria", label: "Categoría", tipo: "select" as const, opciones: categorias.map((c) => ({ value: String(c.id), label: c.nombre })) },
    { key: "estado", label: "Estado", tipo: "select" as const, opciones: [{ value: "activo", label: "Activos" }, { value: "inactivo", label: "Inactivos" }] },
  ];

  const filtro = (p: Producto) => {
    if (categoria && String(p.categoriaId ?? "") !== categoria) return false;
    if (estado === "activo" && !p.activo) return false;
    if (estado === "inactivo" && p.activo) return false;
    return true;
  };

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (p) => `${p.sku} ${p.nombre}`,
    filtro,
  });

  const puedeCrear = puede(permisos, "productos.crear");
  const puedeEditar = puede(permisos, "productos.editar");
  const puedeEliminar = puede(permisos, "productos.eliminar");

  const columnas: Columna<Producto>[] = [
    {
      header: "Producto",
      primary: true,
      cell: (p) => (
        <div>
          <div>{p.nombre}</div>
          <div className="text-xs font-normal text-muted-foreground tabular">{p.sku}</div>
        </div>
      ),
    },
    { header: "Categoría", cell: (p) => (p.categoriaId ? (catPorId.get(p.categoriaId) ?? "—") : "—") },
    { header: "Unidad base", cell: (p) => undPorId.get(p.unidadBaseId) ?? "—" },
    {
      header: "Estado",
      cell: (p) => (
        <Badge variant={p.activo ? "default" : "outline"} className="font-normal">
          {p.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Productos" description="Catálogo de productos de la empresa.">
        {puedeCrear && (
          <Link href="/productos/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo producto
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/productos"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        filtros={filtros}
        items={items}
        getKey={(p) => p.id}
        rowClassName={(p) => (p.activo ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar producto o SKU…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Package, titulo: "Aún no hay productos", texto: "Crea tu primer producto para gestionar inventario y ventas." }}
        actions={
          puedeEditar || puedeEliminar
            ? (p) => (
                <ProductoRowActions id={p.id} nombre={p.nombre} activo={p.activo} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />
              )
            : undefined
        }
      />
    </div>
  );
}
