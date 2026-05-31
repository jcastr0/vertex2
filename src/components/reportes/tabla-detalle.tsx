import type { DetalleReporte } from "@/lib/reportes/tipos";

const cel = (v: string | number | null, tipo: string) => {
  if (v == null || v === "") return "—";
  if (tipo === "money") return "$" + Number(v).toLocaleString("es-CO");
  if (tipo === "num") return Number(v).toLocaleString("es-CO", { maximumFractionDigits: 2 });
  return String(v);
};

export function TablaDetalle({ detalle }: { detalle: DetalleReporte }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>{detalle.columnas.map((c) => <th key={c.header} className={`px-3 py-2 font-medium ${c.tipo !== "texto" ? "text-right" : ""}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {detalle.filas.slice(0, 100).map((fila, i) => (
            <tr key={i} className="hover:bg-muted/20">
              {fila.map((v, j) => <td key={j} className={`px-3 py-2 ${detalle.columnas[j].tipo !== "texto" ? "tabular text-right" : ""}`}>{cel(v, detalle.columnas[j].tipo)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {detalle.filas.length > 100 && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Mostrando 100 de {detalle.filas.length}. Exporta para ver todo.</p>}
    </div>
  );
}
