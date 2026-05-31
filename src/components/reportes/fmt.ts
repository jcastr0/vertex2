// src/components/reportes/fmt.ts
import type { FormatoNum } from "@/lib/reportes/tipos";
export function fmt(v: number, f: FormatoNum): string {
  if (f === "money") return "$" + Math.round(v).toLocaleString("es-CO");
  if (f === "pct") return v.toFixed(1) + "%";
  return v.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
