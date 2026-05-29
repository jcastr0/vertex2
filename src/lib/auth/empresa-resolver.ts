/**
 * Decide la empresa activa (lógica pura, testeable).
 *  - Usuario normal: su propia empresa (o null).
 *  - Superadmin: la de la cookie si es válida; si no, la primera disponible.
 */
export function elegirEmpresa(
  empresaPropia: number | null,
  esSuperadmin: boolean,
  cookie: string | null,
  primeraEmpresaId: number | null,
): number | null {
  if (empresaPropia != null) return empresaPropia;
  if (!esSuperadmin) return null;
  if (cookie && !Number.isNaN(Number(cookie))) return Number(cookie);
  return primeraEmpresaId;
}
