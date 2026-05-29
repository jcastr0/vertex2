import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarTerceros, type Tercero } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TerceroRowActions } from "./tercero-row-actions";
import { Plus, Contact } from "lucide-react";

export const metadata: Metadata = { title: "Terceros — Vertex" };

const ETIQUETA_TIPO: Record<string, string> = {
  proveedor: "Proveedor",
  cliente: "Cliente",
  ambos: "Ambos",
};

export default async function TercerosPage() {
  const sesion = await requirePermiso("terceros.ver");
  const { empresaId } = await requireEmpresa();
  const terceros = await listarTerceros(empresaId);

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
          {t.nombreComercial && (
            <div className="text-xs font-normal text-muted-foreground">{t.nombreComercial}</div>
          )}
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
      cell: (t) => (
        <Badge variant="secondary" className="font-normal">
          {ETIQUETA_TIPO[t.tipo] ?? t.tipo}
        </Badge>
      ),
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

      {terceros.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Contact className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay terceros</p>
          <p className="text-sm text-muted-foreground">
            Registra proveedores y clientes para usarlos en compras y ventas.
          </p>
        </div>
      ) : (
        <ResponsiveTable
          items={terceros}
          getKey={(t) => t.id}
          rowClassName={(t) => (t.activo ? "" : "opacity-60")}
          columns={columnas}
          actions={
            puedeEditar || puedeEliminar
              ? (t) => (
                  <TerceroRowActions
                    id={t.id}
                    nombre={t.razonSocial}
                    activo={t.activo}
                    puedeEditar={puedeEditar}
                    puedeEliminar={puedeEliminar}
                  />
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
