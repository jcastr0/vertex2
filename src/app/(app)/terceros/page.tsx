import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarTerceros, type Tercero } from "@/lib/services/terceros";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TerceroRowActions } from "./tercero-row-actions";
import { Plus, Contact } from "lucide-react";

export const metadata: Metadata = { title: "Terceros — Vertex" };
const PAGE_SIZE = 10;

const ETIQUETA_TIPO: Record<string, string> = {
  proveedor: "Proveedor",
  cliente: "Cliente",
  ambos: "Ambos",
};

export default async function TercerosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; activo?: string }>;
}) {
  const sesion = await requirePermiso("terceros.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw, tipo, activo } = await searchParams;
  const todos = await listarTerceros(empresaId);

  const filtros = [
    { key: "tipo", label: "Tipo", tipo: "select" as const, opciones: [{ value: "cliente", label: "Cliente" }, { value: "proveedor", label: "Proveedor" }, { value: "ambos", label: "Ambos" }] },
    { key: "activo", label: "Estado", tipo: "select" as const, opciones: [{ value: "1", label: "Activos" }, { value: "0", label: "Inactivos" }] },
  ];

  const filtro = (t: Tercero) => {
    if (tipo && t.tipo !== tipo) return false;
    if (activo === "1" && !t.activo) return false;
    if (activo === "0" && t.activo) return false;
    return true;
  };

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (t) => `${t.codigo} ${t.razonSocial} ${t.nombreComercial ?? ""} ${t.identificacion}`,
    filtro,
  });

  const puedeCrear = puede(sesion.rol, "terceros.crear");
  const puedeEditar = puede(sesion.rol, "terceros.editar");
  const puedeEliminar = puede(sesion.rol, "terceros.eliminar");

  const columnas: Columna<Tercero>[] = [
    {
      header: "Razón social",
      primary: true,
      cell: (t) => (
        <div>
          <div>{t.razonSocial}</div>
          {t.nombreComercial && <div className="text-xs font-normal text-muted-foreground">{t.nombreComercial}</div>}
        </div>
      ),
    },
    { header: "Código", className: "w-24", cell: (t) => <span className="tabular">{t.codigo}</span> },
    {
      header: "Identificación",
      cell: (t) => (
        <span className="tabular">
          {t.identificacion}
          {t.digitoVerificacion ? `-${t.digitoVerificacion}` : ""}
        </span>
      ),
    },
    {
      header: "Tipo",
      cell: (t) => <Badge variant="secondary" className="font-normal">{ETIQUETA_TIPO[t.tipo] ?? t.tipo}</Badge>,
    },
    {
      header: "Estado",
      cell: (t) => (
        <Badge variant={t.activo ? "default" : "outline"} className="font-normal">
          {t.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Terceros" description="Proveedores y clientes de la empresa.">
        {puedeCrear && (
          <Link href="/terceros/nuevo" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo tercero
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/terceros"
        q={q}
        page={page}
        filtros={filtros}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(t) => t.id}
        rowClassName={(t) => (t.activo ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar por nombre, código o identificación…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Contact, titulo: "Aún no hay terceros", texto: "Registra proveedores y clientes para usarlos en compras y ventas." }}
        actions={
          puedeEditar || puedeEliminar
            ? (t) => (
                <TerceroRowActions id={t.id} nombre={t.razonSocial} activo={t.activo} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />
              )
            : undefined
        }
      />
    </div>
  );
}
