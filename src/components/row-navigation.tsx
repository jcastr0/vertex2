"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

/**
 * Hace clicable toda una fila de tabla sin depender de un "enlace estirado"
 * (`::after` absoluto), que falla en Safari antiguo porque `<tr position:relative>`
 * no siempre crea bloque contenedor → todas las filas terminaban navegando a la misma.
 *
 * En su lugar, delega el clic: si el usuario hace clic en cualquier parte de una fila
 * con `data-row-href` (y no sobre un enlace o botón real), navega a ese destino.
 * La primera celda conserva un `<Link>` real para teclado, foco y abrir en pestaña.
 */
export function RowNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    // No interceptar enlaces, botones ni sus contenidos (menú de acciones, etc.).
    if (target.closest("a, button")) return;
    const fila = target.closest<HTMLElement>("[data-row-href]");
    const href = fila?.dataset.rowHref;
    if (!href) return;
    // Cmd/Ctrl/clic-medio: abrir en pestaña nueva, como un enlace normal.
    if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
    else router.push(href);
  }

  return <div onClick={onClick}>{children}</div>;
}
