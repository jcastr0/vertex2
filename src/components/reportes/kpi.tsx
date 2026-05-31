import type { KpiDato } from "@/lib/reportes/tipos";

const fmt = (k: KpiDato) =>
  k.formato === "money" ? "$" + Math.round(k.valor).toLocaleString("es-CO")
  : k.formato === "pct" ? k.valor.toFixed(1) + "%"
  : k.valor.toLocaleString("es-CO");

export function KpiFila({ kpis }: { kpis: KpiDato[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{k.label}</p>
          <p className="tabular text-2xl font-bold tracking-tight">{fmt(k)}</p>
        </div>
      ))}
    </div>
  );
}
