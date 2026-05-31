// src/lib/reportes/tipos.ts
import type { LucideIcon } from "lucide-react";

export type FormatoNum = "money" | "num" | "pct";

export interface KpiDato {
  label: string;
  valor: number;
  formato: FormatoNum;
}

export interface SerieDato {
  x: string | number;
  y: number;
  etiqueta?: string;
}

export interface ColumnaExport {
  header: string;
  tipo: "texto" | "money" | "num" | "fecha";
  total?: boolean;
}

export interface DetalleReporte {
  columnas: ColumnaExport[];
  filas: (string | number | null)[][];
}

export interface DatosReporte {
  kpis: KpiDato[];
  series: Record<string, SerieDato[]>;
  detalle: DetalleReporte;
}

/** Filtros leídos de la URL. Siempre traen desde/hasta. */
export type Filtros = Record<string, string | undefined>;

export interface ChartSpec {
  tipo: "linea" | "barras" | "torta" | "dispersion";
  titulo: string;
  /** Clave dentro de DatosReporte.series. */
  serie: string;
  /** Formato del eje de valor / tooltips. */
  formato?: FormatoNum;
  ancho?: "full" | "half";
}

export interface FiltroSpec {
  key: string;
  label: string;
  tipo: "fecha" | "select";
  /** Solo select. */
  opciones?: { value: string; label: string }[];
}

export interface ReporteDef {
  slug: string;
  titulo: string;
  desc: string;
  grupo: string;
  icon: LucideIcon;
  charts: ChartSpec[];
  /** Opciones de filtros que dependen de la empresa (clientes, categorías…). */
  filtros: (empresaId: number) => Promise<FiltroSpec[]>;
  cargar: (empresaId: number, f: Filtros) => Promise<DatosReporte>;
}
