/**
 * Navegación de Vertex: módulos agrupados para el sidebar. Cada ítem declara el
 * permiso (`modulo.ver`) que el rol debe tener para visualizarlo, y si ya está
 * implementado (`listo`) o pendiente de fase (placeholder).
 *
 * Cada grupo tiene `slug` (para la página de grupo `/g/[slug]`) e `icon`
 * (cabecera del acordeón). Cada ítem tiene `desc` (subtítulo en las cards de la
 * página de grupo).
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Warehouse,
  Contact,
  Tags,
  Package,
  ShoppingCart,
  Boxes,
  ArrowLeftRight,
  ClipboardList,
  Receipt,
  Undo2,
  FileMinus,
  HandCoins,
  Wallet,
  BarChart3,
  ShieldCheck,
  BookOpen,
  Route,
  Percent,
  Landmark,
  Database,
  PackageSearch,
  CircleDollarSign,
  Settings,
  Home,
} from "lucide-react";
import type { Modulo } from "./auth/roles";

export interface ItemNav {
  modulo: Modulo;
  label: string;
  href: string;
  icon: LucideIcon;
  listo: boolean;
  desc: string;
}

export interface GrupoNav {
  titulo: string;
  slug: string;
  icon: LucideIcon;
  items: ItemNav[];
}

export const NAV: GrupoNav[] = [
  {
    titulo: "General",
    slug: "general",
    icon: Home,
    items: [
      { modulo: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, listo: true, desc: "Resumen de la operación del día." },
    ],
  },
  {
    titulo: "Maestros",
    slug: "maestros",
    icon: Database,
    items: [
      { modulo: "bodegas", label: "Bodegas", href: "/bodegas", icon: Warehouse, listo: true, desc: "Almacenes y puntos de venta." },
      { modulo: "terceros", label: "Terceros", href: "/terceros", icon: Contact, listo: true, desc: "Clientes y proveedores." },
      { modulo: "categorias", label: "Categorías", href: "/categorias", icon: Tags, listo: true, desc: "Clasificación de productos." },
      { modulo: "productos", label: "Productos", href: "/productos", icon: Package, listo: true, desc: "Catálogo, precios y presentaciones." },
    ],
  },
  {
    titulo: "Compras e inventario",
    slug: "compras-inventario",
    icon: PackageSearch,
    items: [
      { modulo: "pedidos", label: "Pedidos", href: "/pedidos", icon: ShoppingCart, listo: true, desc: "Compras a proveedores y recepción." },
      { modulo: "inventario", label: "Inventario", href: "/inventario", icon: Boxes, listo: true, desc: "Existencias y costo promedio." },
      { modulo: "traslados", label: "Traslados", href: "/traslados", icon: ArrowLeftRight, listo: true, desc: "Movimientos entre bodegas." },
      { modulo: "notas_inventario", label: "Notas de inventario", href: "/notas-inventario", icon: ClipboardList, listo: true, desc: "Ajustes de entrada y salida." },
    ],
  },
  {
    titulo: "Ventas",
    slug: "ventas",
    icon: Receipt,
    items: [
      { modulo: "facturas", label: "Facturas", href: "/facturas", icon: Receipt, listo: true, desc: "Vender y emitir facturas." },
      { modulo: "devoluciones", label: "Devoluciones", href: "/devoluciones", icon: Undo2, listo: true, desc: "Devoluciones de clientes." },
      { modulo: "notas_credito", label: "Notas crédito", href: "/notas-credito", icon: FileMinus, listo: true, desc: "Ajustes y notas crédito." },
    ],
  },
  {
    titulo: "Cartera",
    slug: "cartera",
    icon: CircleDollarSign,
    items: [
      { modulo: "cuentas_cobrar", label: "Cuentas por cobrar", href: "/cuentas-cobrar", icon: HandCoins, listo: true, desc: "Saldos pendientes de clientes." },
      { modulo: "ruta_recaudo", label: "Ruta de recaudo", href: "/ruta-recaudo", icon: Route, listo: true, desc: "Cobro diario en ruta." },
      { modulo: "recaudos", label: "Recaudos", href: "/recaudos", icon: HandCoins, listo: true, desc: "Pagos recibidos de clientes." },
      { modulo: "cuentas_pagar", label: "Cuentas por pagar", href: "/cuentas-pagar", icon: Wallet, listo: true, desc: "Saldos pendientes a proveedores." },
      { modulo: "pagos_proveedor", label: "Pagos a proveedor", href: "/pagos-proveedor", icon: Wallet, listo: true, desc: "Pagos realizados y retenciones." },
      { modulo: "retenciones", label: "Retenciones", href: "/retenciones", icon: Percent, listo: true, desc: "Retenciones parametrizables." },
      { modulo: "tesoreria", label: "Tesorería", href: "/tesoreria", icon: Landmark, listo: true, desc: "Cuentas propias y movimientos." },
    ],
  },
  {
    titulo: "Análisis",
    slug: "analisis",
    icon: BarChart3,
    items: [
      { modulo: "reportes", label: "Reportes", href: "/reportes", icon: BarChart3, listo: true, desc: "Indicadores y utilidad." },
    ],
  },
  {
    titulo: "Administración",
    slug: "administracion",
    icon: Settings,
    items: [
      { modulo: "empresas", label: "Empresas", href: "/empresas", icon: Building2, listo: true, desc: "Razones sociales y datos." },
      { modulo: "usuarios", label: "Usuarios", href: "/usuarios", icon: Users, listo: true, desc: "Cuentas, roles y accesos." },
      { modulo: "auditoria", label: "Auditoría", href: "/auditoria", icon: ShieldCheck, listo: true, desc: "Trazabilidad de cambios." },
      { modulo: "manuales", label: "Manuales", href: "/manuales", icon: BookOpen, listo: true, desc: "Guías de uso del sistema." },
    ],
  },
];

/** Resuelve grupo + ítem activos a partir del pathname (para breadcrumb). */
export function ubicarRuta(pathname: string): { grupo: GrupoNav; item: ItemNav } | null {
  for (const grupo of NAV) {
    for (const item of grupo.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return { grupo, item };
      }
    }
  }
  return null;
}

export function grupoPorSlug(slug: string): GrupoNav | undefined {
  return NAV.find((g) => g.slug === slug);
}
