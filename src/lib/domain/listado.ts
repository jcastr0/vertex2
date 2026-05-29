/**
 * Filtrado por texto + paginación para listados (lógica pura, testeable).
 */
export interface OpcionesListado<T> {
  q?: string;
  page?: number;
  pageSize?: number;
  texto: (item: T) => string;
}

export interface ResultadoListado<T> {
  items: T[];
  total: number;
  page: number;
  totalPaginas: number;
}

export function filtrarPaginar<T>(
  items: T[],
  { q, page = 1, pageSize = 10, texto }: OpcionesListado<T>,
): ResultadoListado<T> {
  const t = (q ?? "").trim().toLowerCase();
  const filtrados = t ? items.filter((i) => texto(i).toLowerCase().includes(t)) : items;
  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const pagina = Math.min(Math.max(1, page), totalPaginas);
  const items_ = filtrados.slice((pagina - 1) * pageSize, pagina * pageSize);
  return { items: items_, total, page: pagina, totalPaginas };
}

/** Normaliza el parámetro `page` de la URL a un entero >= 1. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Construye un generador de href de paginación que conserva `q`. */
export function hrefPaginaFactory(base: string, q: string): (n: number) => string {
  return (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (n > 1) sp.set("page", String(n));
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };
}
