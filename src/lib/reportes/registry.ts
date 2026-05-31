// src/lib/reportes/registry.ts
import "server-only";
import { TrendingUp, HandCoins, Boxes } from "lucide-react";
import type { ReporteDef, FiltroSpec } from "./tipos";
import { cargarVentas, filtrosVentas } from "@/lib/services/reportes/ventas";
import { cargarCarteraCobrar, filtrosCartera } from "@/lib/services/reportes/cartera-cobrar";
import { cargarInventario, filtrosInventario } from "@/lib/services/reportes/inventario";

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
  {
    slug: "cartera-cobrar", titulo: "Cartera por cobrar", desc: "Aging, vencimientos y top deudores.", grupo: "Cartera", icon: HandCoins,
    charts: [
      { tipo: "barras", titulo: "Saldo por tramo (aging)", serie: "porTramo", formato: "money", ancho: "full" },
      { tipo: "torta", titulo: "Vencido vs por vencer", serie: "vencidoVsPorVencer", formato: "money" },
      { tipo: "barras", titulo: "Top deudores", serie: "topDeudores", formato: "money" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "hasta", label: "Corte", tipo: "fecha" },
      { key: "cliente", label: "Cliente", tipo: "select", opciones: await filtrosCartera(empresaId) },
    ],
    cargar: cargarCarteraCobrar,
  },
  {
    slug: "inventario", titulo: "Inventario y rentabilidad", desc: "Valorizado, margen por categoría y dispersión margen/rotación.", grupo: "Operación", icon: Boxes,
    charts: [
      { tipo: "barras", titulo: "Valor por categoría", serie: "valorPorCategoria", formato: "money" },
      { tipo: "barras", titulo: "Margen por categoría", serie: "margenPorCategoria", formato: "money" },
      { tipo: "dispersion", titulo: "Margen % vs unidades vendidas", serie: "margenVsRotacion", formato: "pct", ancho: "full" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
      { key: "categoria", label: "Categoría", tipo: "select", opciones: await filtrosInventario(empresaId) },
    ],
    cargar: cargarInventario,
  },
];

export function getReporte(slug: string): ReporteDef | undefined {
  return REPORTES.find((r) => r.slug === slug);
}

/** Normaliza filtros: aplica rango por defecto (mes actual). */
export function filtrosConDefaults(sp: Record<string, string | undefined>, hoy: string): Record<string, string | undefined> {
  return { ...sp, desde: sp.desde || hoy.slice(0, 8) + "01", hasta: sp.hasta || hoy };
}
