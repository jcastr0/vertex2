export interface FiltroDef {
  key: string;
  label: string;
  tipo: "select" | "fecha" | "rango-fecha";
  opciones?: { value: string; label: string }[];
}

export function aplicarFiltro(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const sp = new URLSearchParams(params.toString());
  if (value) sp.set(key, value);
  else sp.delete(key);
  sp.delete("page");
  return sp;
}

export function limpiarFiltros(params: URLSearchParams, keys: string[]): URLSearchParams {
  const sp = new URLSearchParams(params.toString());
  sp.delete("q");
  sp.delete("page");
  for (const k of keys) sp.delete(k);
  return sp;
}

export function filtrosActivos(
  params: URLSearchParams,
  defs: FiltroDef[],
): { key: string; label: string; valor: string }[] {
  const out: { key: string; label: string; valor: string }[] = [];
  for (const d of defs) {
    const v = params.get(d.key);
    if (!v) continue;
    const legible = d.opciones?.find((o) => o.value === v)?.label ?? v;
    out.push({ key: d.key, label: d.label, valor: legible });
  }
  return out;
}
