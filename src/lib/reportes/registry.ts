// src/lib/reportes/registry.ts
import "server-only";
import { TrendingUp } from "lucide-react";
import type { ReporteDef, FiltroSpec } from "./tipos";
import { cargarVentas, filtrosVentas } from "@/lib/services/reportes/ventas";

export const REPORTES: ReporteDef[] = [
  {
    slug: "ventas",
    titulo: "Ventas",
    desc: "Evolución, top productos y clientes, contado vs crédito.",
    grupo: "Comercial",
    icon: TrendingUp,
    charts: [
      { tipo: "linea", titulo: "Ventas por día", serie: "porDia", formato: "money", ancho: "full" },
      { tipo: "barras", titulo: "Top productos", serie: "topProductos", formato: "money" },
      { tipo: "torta", titulo: "Contado vs crédito", serie: "contadoCredito", formato: "money" },
      { tipo: "barras", titulo: "Top clientes", serie: "topClientes", formato: "money" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "desde", label: "Desde", tipo: "fecha" },
      { key: "hasta", label: "Hasta", tipo: "fecha" },
      { key: "cliente", label: "Cliente", tipo: "select", opciones: await filtrosVentas(empresaId) },
      { key: "tipoVenta", label: "Tipo", tipo: "select", opciones: [{ value: "contado", label: "Contado" }, { value: "credito", label: "Crédito" }] },
    ],
    cargar: cargarVentas,
  },
];

export function getReporte(slug: string): ReporteDef | undefined {
  return REPORTES.find((r) => r.slug === slug);
}

/** Normaliza filtros: aplica rango por defecto (mes actual). */
export function filtrosConDefaults(sp: Record<string, string | undefined>, hoy: string): Record<string, string | undefined> {
  return { ...sp, desde: sp.desde || hoy.slice(0, 8) + "01", hasta: sp.hasta || hoy };
}
