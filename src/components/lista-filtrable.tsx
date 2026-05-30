import type { LucideIcon } from "lucide-react";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { FiltroBar } from "@/components/ui/filtro-bar";
import type { FiltroDef } from "@/lib/domain/filtros";
import { Pagination } from "@/components/ui/pagination";
import { hrefPaginaFactory } from "@/lib/domain/listado";
import type { ReactNode } from "react";

interface Props<T> {
  base: string;
  q: string;
  page: number;
  total: number;
  pageSize: number;
  items: T[];
  columns: Columna<T>[];
  getKey: (row: T) => string | number;
  actions?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string;
  searchPlaceholder: string;
  filtros?: FiltroDef[];
  /** ¿Hay datos antes de filtrar? (distingue "sin datos" de "sin resultados"). */
  hayDatos: boolean;
  vacio: { icon: LucideIcon; titulo: string; texto: string };
}

/** Lista con buscador (?q=), tabla responsiva, estados vacíos y paginación. */
export function ListaFiltrable<T>({
  base,
  q,
  page,
  total,
  pageSize,
  items,
  columns,
  getKey,
  actions,
  rowClassName,
  searchPlaceholder,
  filtros,
  hayDatos,
  vacio,
}: Props<T>) {
  if (!hayDatos) {
    const Icon = vacio.icon;
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <Icon className="mb-3 size-8 text-muted-foreground/50" />
        <p className="font-medium">{vacio.titulo}</p>
        <p className="text-sm text-muted-foreground">{vacio.texto}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <FiltroBar placeholder={searchPlaceholder} filtros={filtros} />
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Sin resultados{q ? ` para “${q}”` : ""}.
        </p>
      ) : (
        <ResponsiveTable
          items={items}
          columns={columns}
          getKey={getKey}
          actions={actions}
          rowClassName={rowClassName}
        />
      )}
      <Pagination total={total} page={page} pageSize={pageSize} hrefForPage={hrefPaginaFactory(base, q)} />
    </>
  );
}
