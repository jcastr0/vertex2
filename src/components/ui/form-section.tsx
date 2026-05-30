import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sección de formulario: tarjeta con cabecera (título + descripción) y cuerpo.
 * Da estructura visual y agrupa campos relacionados de forma elegante.
 */
export function FormSection({
  title,
  description,
  children,
  aside,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /** Acción/elemento alineado a la derecha de la cabecera. */
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
