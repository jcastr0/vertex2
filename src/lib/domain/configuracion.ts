/** Precedencia de configuración: valor de empresa → valor global → default. `undefined` = ausente. */
export function resolverConfig<T>(deEmpresa: T | undefined, global: T | undefined, porDefecto: T): T {
  if (deEmpresa !== undefined) return deEmpresa;
  if (global !== undefined) return global;
  return porDefecto;
}
