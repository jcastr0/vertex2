import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuariosEmpresas } from "@/lib/db/schema";
import { hoyColombia } from "@/lib/fecha";
import { esAfirmacion, debeCrearPedido } from "@/lib/domain/whatsapp";
import { interpretarPedido, type EntradaPedido } from "./interpretar";
import { listarProductos } from "@/lib/services/productos";
import { ultimoPedidoCliente } from "@/lib/services/facturas";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import { cargarConversacion, guardarConversacion, limpiarConversacion } from "@/lib/services/conversaciones";

/**
 * Procesa un turno del chat de WhatsApp con un cliente registrado:
 * carga el borrador previo, llama al cerebro con el contexto del cliente,
 * y decide: crear la cotización (si está completo y el cliente confirma),
 * o pedir lo que falta / pedir confirmación (guardando el borrador).
 * Devuelve el texto a responder por WhatsApp.
 */
export async function procesarTurnoWhatsApp(
  empresaId: number,
  clienteId: number,
  clienteNombre: string,
  telefono: string,
  entrada: EntradaPedido,
): Promise<string> {
  const conv = await cargarConversacion(empresaId, telefono);
  const [ultimo, productos] = await Promise.all([ultimoPedidoCliente(empresaId, clienteId), listarProductos(empresaId)]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const ultimoPedido = ultimo.map((u) => ({ nombre: prodPorId.get(u.productoId) ?? `#${u.productoId}`, cantidad: u.cantidad }));

  const r = await interpretarPedido(empresaId, clienteId, entrada, {
    clienteNombre,
    ultimoPedido,
    borradorPrevio: conv?.borrador?.length ? conv.borrador : undefined,
  });

  const afirmo = entrada.texto ? esAfirmacion(entrada.texto) : false;
  const listoParaCrear = debeCrearPedido({
    completo: r.completo,
    numLineas: r.propuesta.lineas.length,
    afirmo,
    esperabaConfirmacion: conv?.estado === "esperando_confirmacion",
  });

  if (listoParaCrear) {
    const [ue] = await db
      .select({ uid: usuariosEmpresas.usuarioId })
      .from(usuariosEmpresas)
      .where(eq(usuariosEmpresas.empresaId, empresaId))
      .limit(1);
    if (!ue) return "Anoté tu pedido, pero no pude registrarlo automáticamente. Un asesor te contactará. 🙏";
    const obs = [`Pedido por WhatsApp (bot). Tel: ${telefono}.`, r.propuesta.noReconocidos.length ? `No reconocido: ${r.propuesta.noReconocidos.join(", ")}` : null]
      .filter(Boolean)
      .join("\n");
    try {
      await crearCotizacion(
        {
          clienteId,
          fecha: hoyColombia(),
          observaciones: obs,
          lineas: r.propuesta.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
          origen: "bot",
          requiereRevision: true,
        },
        { empresaId, usuarioId: ue.uid, ip: null },
      );
    } catch (e) {
      console.error("[whatsapp] error al crear cotización:", (e as Error).message);
      return "Anoté tu pedido, pero hubo un problema al registrarlo. Un asesor te contactará. 🙏";
    }
    await limpiarConversacion(empresaId, telefono);
    const nombre = clienteNombre ? `, ${clienteNombre.split(" ")[0]}` : "";
    return `¡Listo${nombre}! 🙌 Anoté tu pedido y ya lo estamos preparando. Te confirmamos en un momento.`;
  }

  // Guardar el borrador para continuar en el próximo mensaje.
  const borrador = r.propuesta.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad }));
  if (borrador.length) {
    await guardarConversacion(empresaId, telefono, borrador, r.completo ? "esperando_confirmacion" : "recolectando");
  }
  return r.mensajeAsistente;
}
