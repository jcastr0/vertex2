import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuariosEmpresas } from "@/lib/db/schema";
import { hoyColombia } from "@/lib/fecha";
import { esAfirmacion } from "@/lib/domain/whatsapp";
import { interpretarPedido, type EntradaPedido } from "./interpretar";
import { resumenLineas } from "./mapear";
import { listarProductos } from "@/lib/services/productos";
import { ultimoPedidoCliente } from "@/lib/services/facturas";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import { cargarConversacion, guardarConversacion, limpiarConversacion, type LineaGuardada } from "@/lib/services/conversaciones";
import type { Boton } from "@/lib/whatsapp/enviar";

/** Respuesta del turno: texto y, opcionalmente, botones interactivos. */
export interface RespuestaTurno {
  texto: string;
  botones?: Boton[];
}

const BTN_CONFIRMAR: Boton = { id: "confirmar", title: "✅ Confirmar" };
const BTN_CANCELAR: Boton = { id: "cancelar", title: "❌ Cancelar" };

/** Crea la cotización (origen bot, requiere revisión) a partir de líneas ya resueltas. */
async function crearPedido(empresaId: number, clienteId: number, telefono: string, lineas: LineaGuardada[]): Promise<boolean> {
  const [ue] = await db
    .select({ uid: usuariosEmpresas.usuarioId })
    .from(usuariosEmpresas)
    .where(eq(usuariosEmpresas.empresaId, empresaId))
    .limit(1);
  if (!ue) return false;
  await crearCotizacion(
    {
      clienteId,
      fecha: hoyColombia(),
      observaciones: `Pedido por WhatsApp (bot). Tel: ${telefono}.`,
      lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
      origen: "bot",
      requiereRevision: true,
    },
    { empresaId, usuarioId: ue.uid, ip: null },
  );
  return true;
}

/**
 * Procesa un turno del chat de WhatsApp con un cliente registrado.
 *
 * - Botón/texto "confirmar" estando en "esperando_confirmacion" → crea la
 *   cotización DIRECTO desde lo guardado (no re-interpreta el "sí", que daría
 *   cero líneas y haría un bucle) y da un CIERRE claro.
 * - Botón/texto "cancelar" → descarta el borrador.
 * - En otro caso interpreta el mensaje (pedido nuevo o ajuste), guarda las
 *   líneas y pide confirmación mostrando precios + total y botones.
 */
export async function procesarTurnoWhatsApp(
  empresaId: number,
  clienteId: number,
  clienteNombre: string,
  telefono: string,
  entrada: EntradaPedido & { botonId?: string },
): Promise<RespuestaTurno> {
  const conv = await cargarConversacion(empresaId, telefono);
  const nombreCorto = clienteNombre ? clienteNombre.split(" ")[0] : "";
  const cancelo = entrada.botonId === "cancelar";
  const confirmo = entrada.botonId === "confirmar" || (entrada.texto ? esAfirmacion(entrada.texto) : false);

  // 1) Cancelar el pedido en curso.
  if (cancelo && conv) {
    await limpiarConversacion(empresaId, telefono);
    return { texto: `Listo${nombreCorto ? ", " + nombreCorto : ""}, cancelé el pedido. Cuando quieras me escribes. 🙂` };
  }

  // 2) Confirmar un pedido ya armado → crear desde lo guardado + cierre claro.
  if (conv?.estado === "esperando_confirmacion" && confirmo && conv.lineas.length > 0) {
    try {
      const ok = await crearPedido(empresaId, clienteId, telefono, conv.lineas);
      if (!ok) return { texto: "Anoté tu pedido, pero no pude registrarlo automáticamente. Un asesor te contactará. 🙏" };
    } catch (e) {
      console.error("[wa] error al crear cotización:", (e as Error).message);
      return { texto: "Anoté tu pedido, pero hubo un problema al registrarlo. Un asesor te contactará. 🙏" };
    }
    // Limpiamos ANTES de armar el texto: el pedido ya quedó creado, así no se
    // duplica aunque algo del resumen fallara.
    await limpiarConversacion(empresaId, telefono);
    const { texto: detalle } = resumenLineas(conv.lineas);
    return {
      texto: `✅ ¡Pedido confirmado${nombreCorto ? ", " + nombreCorto : ""}! Gracias por tu compra. 🙌\n\n${detalle}\n\nYa lo estamos preparando y te lo despachamos. ¡Que tengas buen día! 🍅🥬`,
    };
  }

  // 3) Interpretar el mensaje (pedido nuevo o ajuste sobre el borrador previo).
  const [ultimo, productos] = await Promise.all([ultimoPedidoCliente(empresaId, clienteId), listarProductos(empresaId)]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const ultimoPedido = ultimo.map((u) => ({ nombre: prodPorId.get(u.productoId) ?? `#${u.productoId}`, cantidad: u.cantidad }));

  const r = await interpretarPedido(empresaId, clienteId, entrada, {
    clienteNombre,
    ultimoPedido,
    borradorPrevio: conv?.lineas.length ? conv.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })) : undefined,
  });

  const lineas: LineaGuardada[] = r.propuesta.lineas.map((l) => ({ productoId: l.productoId, nombre: l.nombre, unidad: l.unidad, cantidad: l.cantidad, precioUnitario: l.precioUnitario }));

  // 4) Guardar/actualizar el borrador. Si hay pedido claro, pedir confirmación con precios + botones.
  if (lineas.length > 0) {
    await guardarConversacion(empresaId, telefono, lineas, r.completo ? "esperando_confirmacion" : "recolectando");
    if (r.completo) {
      const cuerpo = `${r.propuesta.resumen}\n\n¿Confirmo tu pedido? Toca un botón o responde *sí*.`;
      return { texto: cuerpo, botones: [BTN_CONFIRMAR, BTN_CANCELAR] };
    }
  } else if (conv) {
    // El cliente escribió algo sin productos y no había nada que confirmar: mantenemos el estado previo.
    await guardarConversacion(empresaId, telefono, conv.lineas, conv.estado);
  }
  return { texto: r.mensajeAsistente };
}
