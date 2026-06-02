import "server-only";
import { listarProductos } from "./productos";
import { listarTerceros } from "./terceros";
import { listarFacturas } from "./facturas";
import { listarPedidos } from "./pedidos";

export type TipoResultado = "Producto" | "Cliente" | "Proveedor" | "Factura" | "Pedido";

export interface ResultadoBusqueda {
  tipo: TipoResultado;
  titulo: string;
  subtitulo?: string;
  href: string;
}

/** Normaliza para comparar sin tildes ni mayúsculas. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const POR_GRUPO = 6;

/**
 * Búsqueda global de la empresa activa: productos, terceros, facturas y pedidos.
 * Filtra en memoria (las listas ya están acotadas por empresa). Devuelve hasta
 * {@link POR_GRUPO} resultados por tipo, con su ruta de detalle.
 */
export async function buscarGlobal(empresaId: number, query: string): Promise<ResultadoBusqueda[]> {
  const q = norm(query);
  if (q.length < 2) return [];

  const [productos, terceros, facturas, pedidos] = await Promise.all([
    listarProductos(empresaId),
    listarTerceros(empresaId),
    listarFacturas(empresaId),
    listarPedidos(empresaId),
  ]);

  const out: ResultadoBusqueda[] = [];

  for (const p of productos.filter((p) => norm(`${p.nombre} ${p.sku ?? ""}`).includes(q)).slice(0, POR_GRUPO)) {
    out.push({ tipo: "Producto", titulo: p.nombre, subtitulo: p.sku ? `SKU ${p.sku}` : undefined, href: `/productos/${p.id}` });
  }
  for (const t of terceros.filter((t) => norm(`${t.razonSocial} ${t.identificacion ?? ""}`).includes(q)).slice(0, POR_GRUPO)) {
    out.push({
      tipo: t.tipo === "proveedor" ? "Proveedor" : "Cliente",
      titulo: t.razonSocial,
      subtitulo: t.identificacion ?? undefined,
      href: `/terceros/${t.id}`,
    });
  }
  for (const f of facturas.filter((f) => norm(`${f.factura.numero} ${f.cliente}`).includes(q)).slice(0, POR_GRUPO)) {
    out.push({ tipo: "Factura", titulo: f.factura.numero, subtitulo: f.cliente, href: `/facturas/${f.factura.id}` });
  }
  for (const p of pedidos.filter((p) => norm(`${p.pedido.numero} ${p.proveedor}`).includes(q)).slice(0, POR_GRUPO)) {
    out.push({ tipo: "Pedido", titulo: p.pedido.numero, subtitulo: p.proveedor, href: `/pedidos/${p.pedido.id}` });
  }

  return out;
}
