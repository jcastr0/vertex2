import "server-only";
import { listarProductosVenta } from "@/lib/services/productos";
import { ultimoPrecioPorCliente } from "@/lib/services/facturas";
import { mapearPropuesta, type CatalogoItem, type Propuesta } from "./mapear";
import { pedirPedido, type ImagenEntrada } from "./cliente-claude";
import type { SalidaPedido } from "./schema";

export interface EntradaPedido {
  texto?: string;
  imagenes?: ImagenEntrada[];
}

function construirPrompt(catalogo: CatalogoItem[], texto: string): string {
  const lista = catalogo.map((c) => `- id:${c.id} | ${c.nombre} (SKU ${c.sku})`).join("\n");
  return [
    "Eres el asistente de pedidos de una distribuidora. El cliente envía un pedido (texto y/o foto de una lista).",
    "Tu tarea: extraer los productos y cantidades, y EMPAREJAR cada uno con el catálogo de abajo usando su `id`.",
    "Reglas estrictas:",
    "- Usa SOLO los `id` del catálogo. Si un ítem no calza con ningún producto del catálogo, devuélvelo con productoId: null.",
    "- NO inventes productos ni precios. No devuelvas precios.",
    "- `cantidad` es un número (interpreta unidades como kg/libras/bultos según el texto, pero devuelve solo el número pedido).",
    "- `nombre` = lo que el cliente dijo para ese ítem.",
    "",
    "Catálogo (empareja contra estos id):",
    lista,
    "",
    texto ? `Pedido del cliente (texto): ${texto}` : "El pedido viene en la(s) imagen(es) adjunta(s).",
  ].join("\n");
}

/**
 * Interpreta un pedido (texto/imagen) contra el catálogo de la empresa y el
 * historial de precios del cliente. NO escribe en la base: devuelve una propuesta.
 */
export async function interpretarPedido(
  empresaId: number,
  clienteId: number,
  entrada: EntradaPedido,
  pedir: (prompt: string, imagenes: ImagenEntrada[]) => Promise<SalidaPedido> = pedirPedido,
): Promise<Propuesta> {
  const [productos, historial] = await Promise.all([
    listarProductosVenta(empresaId),
    ultimoPrecioPorCliente(empresaId, clienteId),
  ]);
  const catalogo: CatalogoItem[] = productos.map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio }));
  const prompt = construirPrompt(catalogo, entrada.texto ?? "");
  const salida = await pedir(prompt, entrada.imagenes ?? []);
  return mapearPropuesta(salida, catalogo, historial);
}
