import type { ReactNode } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Columna<T> {
  /** Encabezado de columna. */
  header: string;
  /** Render de la celda. */
  cell: (row: T) => ReactNode;
  /** Marca la columna como título de la tarjeta en móvil. */
  primary?: boolean;
  /** Clases para la celda/encabezado en escritorio. */
  className?: string;
  /** Oculta esta columna en la tarjeta móvil (p. ej. datos redundantes). */
  mobileHidden?: boolean;
}

interface Props<T> {
  items: T[];
  columns: Columna<T>[];
  getKey: (row: T) => string | number;
  /** Acciones por fila (menú), mostradas en tabla y tarjeta. */
  actions?: (row: T) => ReactNode;
  /** Clase opcional por fila (p. ej. opacidad si está inactivo). */
  rowClassName?: (row: T) => string;
  /** Si se define, la fila completa enlaza al detalle (clic en cualquier parte). */
  rowHref?: (row: T) => string;
}

/**
 * Tabla responsiva. En escritorio (md+) es una `<table>`; en móvil cada fila se
 * renderiza como tarjeta apilada (las tablas no funcionan bien en móvil).
 * Con `rowHref`, toda la fila es un enlace (patrón "enlace estirado"); el menú
 * de acciones queda por encima para no disparar la navegación.
 */
export function ResponsiveTable<T>({ items, columns, getKey, actions, rowClassName, rowHref }: Props<T>) {
  const primaria = columns.find((c) => c.primary) ?? columns[0];
  const secundarias = columns.filter((c) => c !== primaria && !c.mobileHidden);

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              {actions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={getKey(row)} className={cn(rowHref && "relative cursor-pointer hover:bg-muted/40", rowClassName?.(row))}>
                {columns.map((c, idx) => (
                  <TableCell key={c.header} className={cn(c.className, rowHref && idx === 0 && "relative")}>
                    {rowHref && idx === 0 ? (
                      <Link href={rowHref(row)} className="after:absolute after:inset-0 after:content-['']">
                        {c.cell(row)}
                      </Link>
                    ) : (
                      c.cell(row)
                    )}
                  </TableCell>
                ))}
                {actions && <TableCell className={cn(rowHref && "relative z-[1]")}>{actions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {items.map((row) => (
          <div
            key={getKey(row)}
            className={cn("relative rounded-lg border border-border bg-card p-4", rowHref && "hover:bg-muted/30", rowClassName?.(row))}
          >
            {rowHref && <Link href={rowHref(row)} aria-label="Ver detalle" className="absolute inset-0 rounded-lg" />}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-medium">{primaria.cell(row)}</div>
              {actions && <div className="relative z-[1] -mr-1 -mt-1 shrink-0">{actions(row)}</div>}
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              {secundarias.map((c) => (
                <div key={c.header} className="contents">
                  <dt className="text-muted-foreground">{c.header}</dt>
                  <dd className="text-right">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
