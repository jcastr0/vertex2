/**
 * Navegación de Vertex: módulos agrupados para el sidebar. Cada ítem declara el
 * permiso (`modulo.ver`) que el rol debe tener para visualizarlo, y si ya está
 * implementado (`listo`) o pendiente de fase (placeholder).
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
} from "lucide-react";
import type { Modulo } from "./auth/roles";

export interface ItemNav {
  modulo: Modulo;
  label: string;
  href: string;
  icon: LucideIcon;
  listo: boolean;
}

export interface GrupoNav {
  titulo: string;
  items: ItemNav[];
}

export const NAV: GrupoNav[] = [
  {
    titulo: "General",
    items: [
      { modulo: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, listo: true },
    ],
  },
  {
    titulo: "Maestros",
    items: [
      { modulo: "bodegas", label: "Bodegas", href: "/bodegas", icon: Warehouse, listo: true },
      { modulo: "terceros", label: "Terceros", href: "/terceros", icon: Contact, listo: true },
      { modulo: "categorias", label: "Categorías", href: "/categorias", icon: Tags, listo: false },
      { modulo: "productos", label: "Productos", href: "/productos", icon: Package, listo: false },
    ],
  },
  {
    titulo: "Compras e inventario",
    items: [
      { modulo: "pedidos", label: "Pedidos", href: "/pedidos", icon: ShoppingCart, listo: false },
      { modulo: "inventario", label: "Inventario", href: "/inventario", icon: Boxes, listo: false },
      { modulo: "traslados", label: "Traslados", href: "/traslados", icon: ArrowLeftRight, listo: false },
      { modulo: "notas_inventario", label: "Notas de inventario", href: "/notas-inventario", icon: ClipboardList, listo: false },
    ],
  },
  {
    titulo: "Ventas",
    items: [
      { modulo: "facturas", label: "Facturas", href: "/facturas", icon: Receipt, listo: false },
      { modulo: "devoluciones", label: "Devoluciones", href: "/devoluciones", icon: Undo2, listo: false },
      { modulo: "notas_credito", label: "Notas crédito", href: "/notas-credito", icon: FileMinus, listo: false },
    ],
  },
  {
    titulo: "Cartera",
    items: [
      { modulo: "cuentas_cobrar", label: "Cuentas por cobrar", href: "/cuentas-cobrar", icon: HandCoins, listo: false },
      { modulo: "recaudos", label: "Recaudos", href: "/recaudos", icon: HandCoins, listo: false },
      { modulo: "cuentas_pagar", label: "Cuentas por pagar", href: "/cuentas-pagar", icon: Wallet, listo: false },
      { modulo: "pagos_proveedor", label: "Pagos a proveedor", href: "/pagos-proveedor", icon: Wallet, listo: false },
    ],
  },
  {
    titulo: "Análisis",
    items: [
      { modulo: "reportes", label: "Reportes", href: "/reportes", icon: BarChart3, listo: false },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { modulo: "empresas", label: "Empresas", href: "/empresas", icon: Building2, listo: false },
      { modulo: "usuarios", label: "Usuarios", href: "/usuarios", icon: Users, listo: false },
      { modulo: "auditoria", label: "Auditoría", href: "/auditoria", icon: ShieldCheck, listo: false },
      { modulo: "manuales", label: "Manuales", href: "/manuales", icon: BookOpen, listo: false },
    ],
  },
];
