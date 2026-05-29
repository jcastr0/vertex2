/**
 * Cálculo del dígito de verificación (DV) de un NIT colombiano según el
 * algoritmo de la DIAN: ponderación de cada dígito (de derecha a izquierda) por
 * una serie de pesos primos, módulo 11.
 */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function calcularDV(nit: string): number {
  const digitos = (nit ?? "").replace(/\D/g, "");
  if (digitos.length === 0) {
    throw new Error("NIT inválido: no contiene dígitos.");
  }

  let suma = 0;
  // De derecha a izquierda, aplicando el peso correspondiente.
  for (let i = 0; i < digitos.length; i++) {
    const digito = Number(digitos[digitos.length - 1 - i]);
    suma += digito * PESOS[i];
  }

  const modulo = suma % 11;
  return modulo > 1 ? 11 - modulo : modulo;
}

/**
 * Devuelve el dígito de verificación (como string) cuando la identificación es
 * un NIT; para otros tipos de identificación no aplica y devuelve null.
 */
export function digitoVerificacionPara(
  tipoIdentificacion: string,
  identificacion: string,
): string | null {
  return tipoIdentificacion === "NIT" ? String(calcularDV(identificacion)) : null;
}
