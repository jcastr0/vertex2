import { Skeleton } from "@/components/ui/skeleton";

/** Encabezado de página (título + acción). */
function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      {action && <Skeleton className="h-9 w-36 rounded-md" />}
    </div>
  );
}

/** Skeleton de tabla/listado: filas con altura constante. */
export function TableSkeleton({
  rows = 6,
  cols = 4,
  maxWidth = "max-w-6xl",
}: {
  rows?: number;
  cols?: number;
  maxWidth?: string;
}) {
  return (
    <div className={`mx-auto ${maxWidth}`}>
      <HeaderSkeleton />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* head */}
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" style={{ maxWidth: i === 0 ? 80 : undefined }} />
          ))}
        </div>
        {/* rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
            style={{ opacity: 1 - r * 0.1 }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" style={{ maxWidth: c === 0 ? 80 : undefined }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton de formulario: campos en grilla. */
export function FormSkeleton({
  fields = 6,
  maxWidth = "max-w-3xl",
}: {
  fields?: number;
  maxWidth?: string;
}) {
  return (
    <div className={`mx-auto ${maxWidth}`}>
      <HeaderSkeleton action={false} />
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton del dashboard: tarjetas KPI + bloque. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
