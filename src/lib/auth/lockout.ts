/**
 * Lógica de bloqueo por intentos fallidos de login.
 *
 * Replica la regla del Vertex original: tras {@link MAX_INTENTOS} intentos
 * fallidos la cuenta se bloquea {@link MINUTOS_BLOQUEO} minutos. Funciones puras
 * para poder verificarlas con pruebas de escritorio sin tocar la base de datos.
 */
export const MAX_INTENTOS = 3;
export const MINUTOS_BLOQUEO = 10;

export interface EstadoBloqueo {
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

/** ¿La cuenta está bloqueada en el instante `ahora`? */
export function estaBloqueado(
  estado: Pick<EstadoBloqueo, "bloqueadoHasta">,
  ahora: Date = new Date(),
): boolean {
  return estado.bloqueadoHasta !== null && estado.bloqueadoHasta.getTime() > ahora.getTime();
}

/** Calcula el nuevo estado tras un intento fallido. */
export function registrarFallo(
  estado: Pick<EstadoBloqueo, "intentosFallidos">,
  ahora: Date = new Date(),
): EstadoBloqueo {
  const intentos = estado.intentosFallidos + 1;
  if (intentos >= MAX_INTENTOS) {
    return {
      intentosFallidos: 0,
      bloqueadoHasta: new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000),
    };
  }
  return { intentosFallidos: intentos, bloqueadoHasta: null };
}

/** Estado tras un login exitoso: todo limpio. */
export function registrarExito(): EstadoBloqueo {
  return { intentosFallidos: 0, bloqueadoHasta: null };
}
