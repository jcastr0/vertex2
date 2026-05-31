// src/lib/reportes/registry.ts
import "server-only";
import { TrendingUp, HandCoins, Boxes, Route, ShoppingBag, Wallet, Landmark } from "lucide-react";
import type { ReporteDef, FiltroSpec } from "./tipos";
import { cargarVentas, filtrosVentas } from "@/lib/services/reportes/ventas";
import { cargarCarteraCobrar, filtrosCartera } from "@/lib/services/reportes/cartera-cobrar";
import { cargarInventario, filtrosInventario } from "@/lib/services/reportes/inventario";
import { cargarRecaudo, filtrosRecaudo } from "@/lib/services/reportes/recaudo";
import { cargarCompras, filtrosCompras } from "@/lib/services/reportes/compras";
import { cargarCarteraPagar, filtrosCarteraPagar } from "@/lib/services/reportes/cartera-pagar";
import { cargarFlujoCaja, filtrosFlujoCaja } from "@/lib/services/reportes/flujo-caja";

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
  {
    slug: "recaudo", titulo: "Recaudo / Ruta", desc: "Recaudado por día y recaudador, efectividad de visitas.", grupo: "Cartera", icon: Route,
    charts: [
      { tipo: "linea", titulo: "Recaudado por día", serie: "porDia", formato: "money", ancho: "full" },
      { tipo: "barras", titulo: "Recaudado por recaudador", serie: "porRecaudador", formato: "money" },
      { tipo: "torta", titulo: "Resultados de visita", serie: "resultados", formato: "num" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
      { key: "recaudador", label: "Recaudador", tipo: "select", opciones: await filtrosRecaudo(empresaId) },
    ],
    cargar: cargarRecaudo,
  },
  {
    slug: "compras", titulo: "Compras", desc: "Compras por proveedor, evolución y costos.", grupo: "Comercial", icon: ShoppingBag,
    charts: [
      { tipo: "linea", titulo: "Compras por día", serie: "porDia", formato: "money", ancho: "full" },
      { tipo: "barras", titulo: "Top proveedores", serie: "topProveedores", formato: "money" },
      { tipo: "barras", titulo: "Costos adicionales", serie: "costos", formato: "money" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
      { key: "proveedor", label: "Proveedor", tipo: "select", opciones: await filtrosCompras(empresaId) },
    ],
    cargar: cargarCompras,
  },
  {
    slug: "cartera-pagar", titulo: "Cuentas por pagar", desc: "Aging de lo que debes y top proveedores.", grupo: "Cartera", icon: Wallet,
    charts: [
      { tipo: "barras", titulo: "Saldo por tramo (aging)", serie: "porTramo", formato: "money", ancho: "full" },
      { tipo: "torta", titulo: "Vencido vs por vencer", serie: "vencidoVsPorVencer", formato: "money" },
      { tipo: "barras", titulo: "Top proveedores", serie: "topProveedores", formato: "money" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "hasta", label: "Corte", tipo: "fecha" },
      { key: "proveedor", label: "Proveedor", tipo: "select", opciones: await filtrosCarteraPagar(empresaId) },
    ],
    cargar: cargarCarteraPagar,
  },
  {
    slug: "flujo-caja", titulo: "Flujo de caja", desc: "Entradas vs salidas y neto por cuenta.", grupo: "Tesorería", icon: Landmark,
    charts: [
      { tipo: "linea", titulo: "Flujo neto por día", serie: "flujoDia", formato: "money", ancho: "full" },
      { tipo: "torta", titulo: "Entradas vs salidas", serie: "entradasVsSalidas", formato: "money" },
      { tipo: "barras", titulo: "Neto por cuenta", serie: "netoPorCuenta", formato: "money" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
      { key: "cuenta", label: "Cuenta", tipo: "select", opciones: await filtrosFlujoCaja(empresaId) },
    ],
    cargar: cargarFlujoCaja,
  },
];

export function getReporte(slug: string): ReporteDef | undefined {
  return REPORTES.find((r) => r.slug === slug);
}

/** Normaliza filtros: aplica rango por defecto (mes actual). */
export function filtrosConDefaults(sp: Record<string, string | undefined>, hoy: string): Record<string, string | undefined> {
  return { ...sp, desde: sp.desde || hoy.slice(0, 8) + "01", hasta: sp.hasta || hoy };
}
