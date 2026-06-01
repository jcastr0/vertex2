/**
 * Fecha y hora centralizadas en la zona horaria de Colombia (America/Bogota).
 *
 * Por qué: el servidor (Vercel) corre en UTC. `new Date().toISOString()` y
 * `now()` dan UTC, así que de noche en Colombia (UTC−5) la fecha ya saltó al día
 * siguiente — y el sistema mostraba el mes/día equivocado. Aquí toda derivación
 * y formato de fecha pasa por Colombia, para que SIEMPRE se vea la hora efectiva
 * en que algo ocurrió en Colombia.
 *
 * Dos tipos de valor, tratados distinto:
 *  - **Fecha-solo** (`YYYY-MM-DD`, columnas `date` como factura.fecha): es una
 *    fecha de calendario sin hora; se formatea TAL CUAL, sin desplazar zona.
 *  - **Instante** (`timestamptz` como movimientos.fecha, o un `Date`): es un
 *    momento en el tiempo; se formatea EN hora de Colombia.
 */
export const TZ = "America/Bogota";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** `YYYY-MM-DD` de un instante, en hora de Colombia. */
export function fechaEnColombia(instante: Date = new Date()): string {
  // en-CA produce el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** La fecha de hoy (`YYYY-MM-DD`) en Colombia. Úsalo para defaults y comparaciones de "hoy". */
export function hoyColombia(): string {
  return fechaEnColombia();
}

/** Año, mes (0–11) y día de un instante, en Colombia. Para lógica de "este mes". */
export function partesColombia(instante: Date = new Date()): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fechaEnColombia(instante).split("-").map(Number);
  return { anio, mes: mes - 1, dia };
}

/**
 * Día de la semana en Colombia con la convención del dominio: lunes=1 … sábado=6,
 * domingo=7 (igual que `diaSemana` de ruta-recaudo, para casar con DIAS_COBRO).
 */
export function diaSemanaColombia(instante: Date = new Date()): number {
  const iso = fechaEnColombia(instante);
  // Mediodía UTC para no cruzar el límite del día al calcular el día de semana.
  const d = new Date(iso + "T12:00:00Z").getUTCDay(); // 0=domingo … 6=sábado
  return d === 0 ? 7 : d;
}

/** Nombre del mes (0–11). */
export function nombreMes(mes: number): string {
  return MESES[mes] ?? "";
}

/** Suma días a una fecha-solo (`YYYY-MM-DD`) y devuelve otra fecha-solo. Sin drift de zona. */
export function sumarDias(isoDate: string, dias: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Formatea una **fecha-solo** (`YYYY-MM-DD`) como "31 may". Sin desplazar zona. */
export function fechaCorta(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1] ?? ""}`;
}

/** Formatea una **fecha-solo** (`YYYY-MM-DD`) como "31 may 2026". Sin desplazar zona. */
export function fechaLarga(isoDate: string): string {
  const [a, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1] ?? ""} ${a}`;
}

/** Formatea un **instante** (Date o ISO con zona) como solo fecha, en hora de Colombia. */
export function fechaInstante(instante: Date | string): string {
  const iso = fechaEnColombia(new Date(instante));
  return fechaLarga(iso);
}

/** Formatea un **instante** como fecha y hora en Colombia: "31/05/2026, 10:00 p. m." */
export function fechaHora(instante: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(instante));
}
