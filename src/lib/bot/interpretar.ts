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
export interface ContextoCliente {
  clienteNombre?: string;
  ultimoPedido?: { nombre: string; cantidad: number }[];
  borradorPrevio?: { nombre: string; cantidad: number }[];
}
export interface ResultadoTurno {
  mensajeAsistente: string;
  propuesta: Propuesta;
  completo: boolean;
}

function lineasTexto(arr?: { nombre: string; cantidad: number }[]): string {
  return arr && arr.length ? arr.map((l) => `${l.cantidad} × ${l.nombre}`).join(", ") : "";
}

function construirPrompt(catalogo: CatalogoItem[], texto: string, ctx: ContextoCliente): string {
  const lista = catalogo.map((c) => `- id:${c.id} | ${c.nombre} (SKU ${c.sku})`).join("\n");
  return [
    "Eres el asistente de pedidos de una distribuidora, cálido y breve. Atiendes a un cliente conocido.",
    ctx.clienteNombre ? `El cliente se llama ${ctx.clienteNombre}; salúdalo por su nombre de forma natural.` : "",
    ctx.ultimoPedido?.length ? `Su último pedido fue: ${lineasTexto(ctx.ultimoPedido)}. Si pide "lo mismo", "lo de siempre" o "la vez pasada", usa ese pedido.` : "",
    ctx.borradorPrevio?.length ? `Pedido en progreso de esta conversación: ${lineasTexto(ctx.borradorPrevio)}. Complétalo o ajústalo con el nuevo mensaje.` : "",
    "",
    "Tarea: extraer productos y cantidades y EMPAREJAR cada uno con el catálogo por su `id`.",
    "Reglas: usa SOLO ids del catálogo; si un ítem no calza, productoId: null. NO inventes productos ni precios. No devuelvas precios.",
    "`mensajeAsistente`: tu respuesta al cliente (saludo + lo que entendiste o lo que falta).",
    "`completo`: true si el pedido está claro y listo; false si falta información (entonces pide lo que falta en mensajeAsistente).",
    "",
    "Catálogo:",
    lista,
    "",
    texto ? `Mensaje del cliente: ${texto}` : "El cliente envió una imagen con su pedido.",
  ].filter(Boolean).join("\n");
}

/**
 * Interpreta un turno del chat de pedidos contra el catálogo de la empresa y el
 * historial del cliente. NO escribe en la base: devuelve mensaje + propuesta + completo.
 */
export async function interpretarPedido(
  empresaId: number,
  clienteId: number,
  entrada: EntradaPedido,
  ctx: ContextoCliente = {},
  pedir: (prompt: string, imagenes: ImagenEntrada[]) => Promise<SalidaPedido> = pedirPedido,
): Promise<ResultadoTurno> {
  const [productos, historial] = await Promise.all([
    listarProductosVenta(empresaId),
    ultimoPrecioPorCliente(empresaId, clienteId),
  ]);
  const catalogo: CatalogoItem[] = productos.map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio }));
  const salida = await pedir(construirPrompt(catalogo, entrada.texto ?? "", ctx), entrada.imagenes ?? []);
  const propuesta = mapearPropuesta(salida, catalogo, historial);
  return { mensajeAsistente: salida.mensajeAsistente, propuesta, completo: salida.completo };
}
