import type { DatosReporte, ChartSpec } from "@/lib/reportes/tipos";
import { KpiFila } from "./kpi";
import { TablaDetalle } from "./tabla-detalle";
import { ChartLinea } from "./chart-linea";
import { ChartBarras } from "./chart-barras";
import { ChartTorta } from "./chart-torta";
import { ChartDispersion } from "./chart-dispersion";

function Grafico({ spec, datos }: { spec: ChartSpec; datos: DatosReporte }) {
  const serie = datos.series[spec.serie] ?? [];
  const Comp = spec.tipo === "linea" ? ChartLinea : spec.tipo === "barras" ? ChartBarras : spec.tipo === "torta" ? ChartTorta : ChartDispersion;
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${spec.ancho === "full" ? "lg:col-span-2" : ""}`}>
      <h3 className="mb-2 text-sm font-semibold">{spec.titulo}</h3>
      <Comp datos={serie} formato={spec.formato} />
    </div>
  );
}

export function ReporteDashboard({ datos, charts }: { datos: DatosReporte; charts: ChartSpec[] }) {
  return (
    <div className="space-y-6">
      <KpiFila kpis={datos.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c, i) => <Grafico key={i} spec={c} datos={datos} />)}
      </div>
      <div>
        <h3 className="mb-2 text-base font-semibold">Detalle</h3>
        <TablaDetalle detalle={datos.detalle} />
      </div>
    </div>
  );
}
