import { UserRound } from "lucide-react";
import { fechaHora } from "@/lib/fecha";

/**
 * Pie de trazabilidad discreto para vistas de detalle: "Creado por X · fecha-hora".
 * Sutil (texto pequeño, atenuado) para no competir con el contenido.
 */
export function CreadoPor({ nombre, fecha }: { nombre?: string | null; fecha: Date | string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1 text-xs text-muted-foreground">
      <UserRound className="size-3.5 shrink-0 opacity-60" aria-hidden />
      <span>Creado por</span>
      <span className="font-medium text-foreground/75">{nombre ?? "—"}</span>
      <span aria-hidden className="opacity-40">·</span>
      <span className="tabular">{fechaHora(fecha)}</span>
    </p>
  );
}
