/**
 * Traduce la auditoría cruda (acción + filas JSON anterior/nuevo) a lenguaje
 * humano: quién hizo qué, sobre qué registro, y qué cambió en cristiano.
 * Lógica pura, con prueba de escritorio.
 */
import { fechaLarga, fechaHora } from "@/lib/fecha";

export type Accion = "CREAR" | "ACTUALIZAR" | "ELIMINAR";

/** Verbo en pasado para la narración. */
export const VERBO: Record<string, string> = {
  CREAR: "creó",
  ACTUALIZAR: "actualizó",
  ELIMINAR: "eliminó",
};

type Entidad = { sing: string; art: "el" | "la" };

/** Entidad singular (con artículo) por código de tabla vxNN. */
const ENTIDAD: Record<string, Entidad> = {
  vx01: { sing: "rol", art: "el" },
  vx02: { sing: "usuario", art: "el" },
  vx04: { sing: "empresa", art: "la" },
  vx05: { sing: "acceso de usuario", art: "el" },
  vx06: { sing: "bodega", art: "la" },
  vx07: { sing: "tercero", art: "el" },
  vx08: { sing: "categoría", art: "la" },
  vx09: { sing: "unidad de medida", art: "la" },
  vx10: { sing: "producto", art: "el" },
  vx13: { sing: "pedido", art: "el" },
  vx18: { sing: "nota de inventario", art: "la" },
  vx19: { sing: "traslado", art: "el" },
  vx21: { sing: "factura", art: "la" },
  vx23: { sing: "devolución", art: "la" },
  vx25: { sing: "nota crédito", art: "la" },
  vx27: { sing: "pago a proveedor", art: "el" },
  vx29: { sing: "recaudo", art: "el" },
  vx31: { sing: "retención", art: "la" },
  vx33: { sing: "cuenta", art: "la" },
  vx34: { sing: "cuenta bancaria", art: "la" },
};

export function entidadDeTabla(tabla: string): Entidad {
  return ENTIDAD[tabla] ?? { sing: "registro", art: "el" };
}

type Registro = Record<string, unknown> | null | undefined;

/** Identificador legible de un registro: número, nombre o #id. */
export function etiquetaRegistro(...regs: Registro[]): string | null {
  for (const r of regs) {
    if (!r) continue;
    const v = r["numero"] ?? r["nombre"] ?? r["razonSocial"] ?? r["codigo"];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  for (const r of regs) {
    if (r && r["id"] != null) return `#${r["id"]}`;
  }
  return null;
}

// ── Campos: etiqueta legible y formato de valor ──────────────────────────────

const ETIQUETA_CAMPO: Record<string, string> = {
  numero: "Número",
  fecha: "Fecha",
  total: "Total",
  subtotal: "Subtotal",
  impuestos: "Impuestos",
  valor: "Valor",
  saldo: "Saldo",
  saldoPendiente: "Saldo pendiente",
  saldoInicial: "Saldo inicial",
  estado: "Estado",
  nombre: "Nombre",
  razonSocial: "Razón social",
  nombreComercial: "Nombre comercial",
  identificacion: "Identificación",
  nit: "NIT",
  email: "Correo",
  telefono: "Teléfono",
  celular: "Celular",
  direccion: "Dirección",
  ciudad: "Ciudad",
  pais: "País",
  activo: "Activo",
  activa: "Activa",
  tipo: "Tipo",
  motivo: "Motivo",
  motivoAnulacion: "Motivo de anulación",
  observaciones: "Observaciones",
  descripcion: "Descripción",
  cantidad: "Cantidad",
  cantidadActual: "Existencia",
  precioUnitario: "Precio unitario",
  costoUnitario: "Costo",
  costoPromedio: "Costo promedio",
  metodoPago: "Método de pago",
  referencia: "Referencia",
  paletaTema: "Tema",
  esElectronica: "Electrónica",
  esRecaudador: "Recaudador",
  diaCobro: "Día de cobro",
  cupoCredito: "Cupo de crédito",
  retencionTotal: "Retención",
  porcentaje: "Porcentaje",
  permisos: "Permisos",
  banco: "Banco",
  numeroCuenta: "N° de cuenta",
};

/** "saldoPendiente" → "Saldo pendiente"; "dia_cobro" → "Dia cobro". */
function humanizar(campo: string): string {
  const s = campo
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function etiquetaCampo(campo: string): string {
  return ETIQUETA_CAMPO[campo] ?? humanizar(campo);
}

const ES_DINERO = /total|saldo|valor|precio|costo|subtotal|cupo|monto|retencion|impuesto|desembol/i;
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Formatea un valor para mostrar; null si no hay nada que mostrar. */
export function formatearValor(campo: string, valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (campo === "diaCobro" && typeof valor === "number") return DIAS[valor] ?? String(valor);
  if (ES_DINERO.test(campo)) {
    const n = Number(valor);
    if (!Number.isNaN(n)) return "$" + Math.round(n).toLocaleString("es-CO");
  }
  if (typeof valor === "string") {
    // Fecha-hora ISO o fecha simple.
    if (/^\d{4}-\d{2}-\d{2}T/.test(valor)) return fechaHora(valor);
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return fechaLarga(valor);
    return valor.length > 80 ? valor.slice(0, 80) + "…" : valor;
  }
  if (Array.isArray(valor)) return `${valor.length} elemento${valor.length !== 1 ? "s" : ""}`;
  if (typeof valor === "object") return "—";
  return String(valor);
}

export interface Cambio {
  label: string;
  antes: string | null;
  despues: string | null;
}

const IGNORAR = new Set(["id", "empresaId", "usuarioId", "createdAt", "updatedAt", "password", "codigo"]);
function relevante(campo: string): boolean {
  return !IGNORAR.has(campo) && !/Id$/.test(campo) && !/^[a-z]+Id$/i.test(campo);
}

/** Campos a destacar al crear/eliminar (los más significativos del registro). */
const DESTACADOS = ["numero", "estado", "total", "valor", "saldo", "fecha", "nombre", "razonSocial", "tipo", "motivo"];

/**
 * Describe los cambios en lenguaje humano:
 *  - ACTUALIZAR: campos que cambiaron (antes → después).
 *  - CREAR/ELIMINAR: campos destacados del registro.
 */
export function describirCambios(accion: Accion, anterior: Registro, nuevo: Registro): Cambio[] {
  if (accion === "ACTUALIZAR" && anterior && nuevo) {
    const claves = new Set([...Object.keys(anterior), ...Object.keys(nuevo)]);
    const out: Cambio[] = [];
    for (const k of claves) {
      if (!relevante(k)) continue;
      const a = anterior[k];
      const b = nuevo[k];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const antes = formatearValor(k, a);
      const despues = formatearValor(k, b);
      if (antes === despues) continue;
      out.push({ label: etiquetaCampo(k), antes, despues });
    }
    return out;
  }
  // CREAR / ELIMINAR: destacar campos clave del registro disponible.
  const reg = nuevo ?? anterior;
  if (!reg) return [];
  const esBorrado = accion === "ELIMINAR";
  const out: Cambio[] = [];
  for (const k of DESTACADOS) {
    if (!(k in reg)) continue;
    const v = formatearValor(k, reg[k]);
    if (v == null) continue;
    out.push({ label: etiquetaCampo(k), antes: esBorrado ? v : null, despues: esBorrado ? null : v });
  }
  return out;
}
