/**
 * Roles y permisos de Vertex.
 *
 * 6 roles del sistema. Permisos con formato `modulo.accion`. El comodín `"*"`
 * concede todo (SuperAdmin). La verificación es pura y testeable.
 */

export const MODULOS = [
  "empresas",
  "usuarios",
  "bodegas",
  "terceros",
  "categorias",
  "productos",
  "pedidos",
  "inventario",
  "traslados",
  "notas_inventario",
  "facturas",
  "devoluciones",
  "notas_credito",
  "cuentas_cobrar",
  "cuentas_pagar",
  "recaudos",
  "ruta_recaudo",
  "pagos_proveedor",
  "reportes",
  "auditoria",
  "manuales",
  "dashboard",
] as const;

export const ACCIONES = ["ver", "crear", "editar", "eliminar"] as const;

export type Modulo = (typeof MODULOS)[number];
export type Accion = (typeof ACCIONES)[number];
export type Permiso = `${Modulo}.${Accion}`;

/** Genera `modulo.accion` para un módulo y un subconjunto de acciones. */
function p(modulo: Modulo, acciones: readonly Accion[]): Permiso[] {
  return acciones.map((a) => `${modulo}.${a}` as Permiso);
}

const CRUD = ACCIONES;
const VER = ["ver"] as const;
const VER_CREAR_EDITAR = ["ver", "crear", "editar"] as const;

/** Todas las acciones de lectura para todos los módulos (rol Contador). */
const SOLO_LECTURA: Permiso[] = MODULOS.flatMap((m) => p(m, VER));

export const ROLES: Record<string, readonly (Permiso | "*")[]> = {
  SuperAdmin: ["*"],

  Admin: [
    ...p("usuarios", CRUD),
    ...p("bodegas", CRUD),
    ...p("terceros", CRUD),
    ...p("categorias", CRUD),
    ...p("productos", CRUD),
    ...p("pedidos", CRUD),
    ...p("inventario", CRUD),
    ...p("traslados", CRUD),
    ...p("notas_inventario", CRUD),
    ...p("facturas", CRUD),
    ...p("devoluciones", CRUD),
    ...p("notas_credito", CRUD),
    ...p("cuentas_cobrar", CRUD),
    ...p("cuentas_pagar", CRUD),
    ...p("recaudos", CRUD),
    ...p("ruta_recaudo", VER),
    ...p("pagos_proveedor", CRUD),
    ...p("reportes", VER),
    ...p("auditoria", VER),
    ...p("manuales", VER),
    ...p("dashboard", VER),
  ],

  Operador: [
    ...p("terceros", VER_CREAR_EDITAR),
    ...p("categorias", VER_CREAR_EDITAR),
    ...p("productos", VER_CREAR_EDITAR),
    ...p("pedidos", VER_CREAR_EDITAR),
    ...p("inventario", VER_CREAR_EDITAR),
    ...p("traslados", VER_CREAR_EDITAR),
    ...p("notas_inventario", VER_CREAR_EDITAR),
    ...p("facturas", VER_CREAR_EDITAR),
    ...p("devoluciones", VER_CREAR_EDITAR),
    ...p("notas_credito", VER_CREAR_EDITAR),
    ...p("recaudos", VER_CREAR_EDITAR),
    ...p("ruta_recaudo", VER),
    ...p("pagos_proveedor", VER_CREAR_EDITAR),
    ...p("cuentas_cobrar", VER),
    ...p("cuentas_pagar", VER),
    ...p("reportes", VER),
    ...p("manuales", VER),
    ...p("dashboard", VER),
  ],

  Vendedor: [
    ...p("facturas", VER_CREAR_EDITAR),
    ...p("terceros", ["ver", "crear"]),
    ...p("productos", VER),
    ...p("devoluciones", ["ver", "crear"]),
    ...p("notas_credito", ["ver", "crear"]),
    ...p("recaudos", ["ver", "crear"]),
    ...p("ruta_recaudo", VER),
    ...p("cuentas_cobrar", VER),
    ...p("manuales", VER),
    ...p("dashboard", VER),
  ],

  Bodega: [
    ...p("inventario", ["ver", "editar"]),
    ...p("traslados", CRUD),
    ...p("notas_inventario", CRUD),
    ...p("pedidos", ["ver", "editar"]),
    ...p("productos", VER),
    ...p("bodegas", VER),
    ...p("manuales", VER),
    ...p("dashboard", VER),
  ],

  Contador: [...SOLO_LECTURA],
};

/** ¿El rol `rol` tiene el permiso `permiso`? */
export function puede(rol: string | null | undefined, permiso: Permiso): boolean {
  if (!rol) return false;
  const permisos = ROLES[rol];
  if (!permisos) return false;
  return permisos.includes("*") || permisos.includes(permiso);
}
