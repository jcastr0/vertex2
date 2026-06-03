import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuariosEmpresas } from "@/lib/db/schema";
import { hoyColombia } from "@/lib/fecha";
import { esAfirmacion } from "@/lib/domain/whatsapp";
import { interpretarPedido, type EntradaPedido } from "./interpretar";
import { listarProductos } from "@/lib/services/productos";
import { ultimoPedidoCliente } from "@/lib/services/facturas";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import { cargarConversacion, guardarConversacion, limpiarConversacion, type LineaGuardada } from "@/lib/services/conversaciones";

/** Crea la cotización (origen bot, requiere revisión) a partir de líneas ya resueltas. */
async function crearPedido(empresaId: number, clienteId: number, telefono: string, lineas: LineaGuardada[], noReconocidos: string[]): Promise<boolean> {
  const [ue] = await db
    .select({ uid: usuariosEmpresas.usuarioId })
    .from(usuariosEmpresas)
    .where(eq(usuariosEmpresas.empresaId, empresaId))
    .limit(1);
  if (!ue) return false;
  const obs = [`Pedido por WhatsApp (bot). Tel: ${telefono}.`, noReconocidos.length ? `No reconocido: ${noReconocidos.join(", ")}` : null]
    .filter(Boolean)
    .join("\n");
  await crearCotizacion(
    {
      clienteId,
      fecha: hoyColombia(),
      observaciones: obs,
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
 * Clave: cuando el turno anterior dejó un pedido listo (estado
 * "esperando_confirmacion") y el cliente ahora AFIRMA ("sí", "confirmo"…),
 * creamos la cotización DIRECTO desde las líneas guardadas — sin re-interpretar
 * el "sí" con Claude (que no menciona productos y devolvería cero líneas, lo que
 * causaba que el bot volviera a preguntar en bucle).
 *
 * En cualquier otro caso interpretamos el mensaje (pedido nuevo o ajuste),
 * guardamos las líneas resueltas y pedimos confirmación.
 */
export async function procesarTurnoWhatsApp(
  empresaId: number,
  clienteId: number,
  clienteNombre: string,
  telefono: string,
  entrada: EntradaPedido,
): Promise<string> {
  const conv = await cargarConversacion(empresaId, telefono);
  const afirmo = entrada.texto ? esAfirmacion(entrada.texto) : false;
  const nombreCorto = clienteNombre ? `, ${clienteNombre.split(" ")[0]}` : "";

  // 1) Confirmación de un pedido ya armado → crear desde lo guardado.
  if (conv?.estado === "esperando_confirmacion" && afirmo && conv.lineas.length > 0) {
    try {
      const ok = await crearPedido(empresaId, clienteId, telefono, conv.lineas, []);
      if (!ok) return "Anoté tu pedido, pero no pude registrarlo automáticamente. Un asesor te contactará. 🙏";
    } catch (e) {
      console.error("[wa] error al crear cotización:", (e as Error).message);
      return "Anoté tu pedido, pero hubo un problema al registrarlo. Un asesor te contactará. 🙏";
    }
    await limpiarConversacion(empresaId, telefono);
    return `¡Listo${nombreCorto}! 🙌 Anoté tu pedido y ya lo estamos preparando. Te confirmamos en un momento.`;
  }

  // 2) Interpretar el mensaje (pedido nuevo o ajuste sobre el borrador previo).
  const [ultimo, productos] = await Promise.all([ultimoPedidoCliente(empresaId, clienteId), listarProductos(empresaId)]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const ultimoPedido = ultimo.map((u) => ({ nombre: prodPorId.get(u.productoId) ?? `#${u.productoId}`, cantidad: u.cantidad }));

  const r = await interpretarPedido(empresaId, clienteId, entrada, {
    clienteNombre,
    ultimoPedido,
    borradorPrevio: conv?.lineas.length ? conv.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })) : undefined,
  });

  const lineas: LineaGuardada[] = r.propuesta.lineas.map((l) => ({ productoId: l.productoId, nombre: l.nombre, cantidad: l.cantidad, precioUnitario: l.precioUnitario }));

  // 3) Guardar/actualizar el borrador. Si hay pedido claro, queda esperando confirmación.
  if (lineas.length > 0) {
    await guardarConversacion(empresaId, telefono, lineas, r.completo ? "esperando_confirmacion" : "recolectando");
  } else if (conv) {
    // El cliente escribió algo sin productos y no había nada que confirmar: mantenemos el estado previo.
    await guardarConversacion(empresaId, telefono, conv.lineas, conv.estado);
  }
  return r.mensajeAsistente;
}
