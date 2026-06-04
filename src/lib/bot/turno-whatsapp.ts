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
import { crearCotizacion, reemplazarLineasCotizacion, obtenerCotizacion } from "@/lib/services/cotizaciones";
import { cargarConversacion, guardarConversacion, limpiarConversacion, type LineaGuardada } from "@/lib/services/conversaciones";
import type { Boton } from "@/lib/whatsapp/enviar";

/** Respuesta del turno: texto y, opcionalmente, botones interactivos. */
export interface RespuestaTurno {
  texto: string;
  botones?: Boton[];
}

const BTN_CONFIRMAR: Boton = { id: "confirmar", title: "✅ Confirmar" };
const BTN_CANCELAR: Boton = { id: "cancelar", title: "❌ Cancelar" };
const VENTANA_MS = 24 * 60 * 60 * 1000; // un pedido se puede ampliar dentro de 24h

async function usuarioDeEmpresa(empresaId: number): Promise<number | null> {
  const [ue] = await db.select({ uid: usuariosEmpresas.usuarioId }).from(usuariosEmpresas).where(eq(usuariosEmpresas.empresaId, empresaId)).limit(1);
  return ue?.uid ?? null;
}

const aLineasNuevas = (lineas: LineaGuardada[]) => lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario }));

/**
 * Procesa un turno del chat de WhatsApp con un cliente registrado.
 *
 * Estados de la conversación:
 *  - "recolectando": armando el pedido (incompleto).
 *  - "confirmando": pedido claro, esperando que el cliente confirme.
 *  - "confirmado": cotización ya creada; el cliente puede AMPLIARLA el mismo día.
 *
 * Al confirmar: si hay una cotización abierta (ampliación) la actualiza; si no,
 * crea una nueva. Si el pedido del día ya se facturó o pasó de 24h, se arranca
 * uno nuevo y se avisa.
 */
export async function procesarTurnoWhatsApp(
  empresaId: number,
  clienteId: number,
  clienteNombre: string,
  telefono: string,
  entrada: EntradaPedido & { botonId?: string },
): Promise<RespuestaTurno> {
  let conv = await cargarConversacion(empresaId, telefono);
  const nombreCorto = clienteNombre ? clienteNombre.split(" ")[0] : "";
  const cancelo = entrada.botonId === "cancelar";
  const confirmo = entrada.botonId === "confirmar" || (entrada.texto ? esAfirmacion(entrada.texto) : false);

  // 1) Cancelar lo que esté en curso.
  if (cancelo && conv) {
    await limpiarConversacion(empresaId, telefono);
    return { texto: `Listo${nombreCorto ? ", " + nombreCorto : ""}, lo dejé así. Cuando quieras me escribes. 🙂` };
  }

  // 2) Confirmar un pedido armado → crear o (si es ampliación) actualizar la cotización.
  if (conv?.estado === "confirmando" && confirmo && conv.lineas.length > 0) {
    try {
      const uid = await usuarioDeEmpresa(empresaId);
      if (!uid) return { texto: "Anoté tu pedido, pero no pude registrarlo automáticamente. Un asesor te contactará. 🙏" };
      const ctx = { empresaId, usuarioId: uid, ip: null };
      let cotizacionId = conv.cotizacionId;
      if (cotizacionId) {
        const ok = await reemplazarLineasCotizacion(empresaId, cotizacionId, aLineasNuevas(conv.lineas), ctx);
        if (!ok) cotizacionId = undefined; // ya no editable (facturada): caemos a crear nueva
      }
      if (!cotizacionId) {
        cotizacionId = await crearCotizacion(
          { clienteId, fecha: hoyColombia(), observaciones: `Pedido por WhatsApp (bot). Tel: ${telefono}.`, lineas: aLineasNuevas(conv.lineas), origen: "bot", requiereRevision: true },
          ctx,
        );
      }
      const { texto: detalle } = resumenLineas(conv.lineas);
      // Mantenemos la conversación como "confirmado" para permitir ampliar el mismo día.
      await guardarConversacion(empresaId, telefono, conv.lineas, conv.historial.slice(-8), "confirmado", cotizacionId);
      return {
        texto: `✅ ¡Pedido confirmado${nombreCorto ? ", " + nombreCorto : ""}! Gracias por tu compra. 🙌\n\n${detalle}\n\nYa lo estamos preparando. Si se te olvidó algo, dímelo y te lo sumo. 🍅🥬`,
      };
    } catch (e) {
      console.error("[wa] error al confirmar pedido:", (e as Error).message);
      return { texto: "Anoté tu pedido, pero hubo un problema al registrarlo. Un asesor te contactará. 🙏" };
    }
  }

  // 2b) Si el pedido del día ya está confirmado, decidir si AMPLIAMOS o arrancamos uno nuevo.
  let ampliando: number | undefined;
  let baseLineas: LineaGuardada[] = [];
  if (conv?.estado === "confirmado" && conv.cotizacionId) {
    const cot = await obtenerCotizacion(empresaId, conv.cotizacionId);
    const vigente = cot && cot.estado === "pendiente" && cot.createdAt && Date.now() - new Date(cot.createdAt).getTime() < VENTANA_MS;
    if (vigente) {
      ampliando = conv.cotizacionId; // sumaremos a esta misma cotización
      baseLineas = conv.lineas;
    } else {
      await limpiarConversacion(empresaId, telefono); // facturada o vieja → pedido nuevo
      conv = null;
    }
  }

  // 3) Interpretar el mensaje. Prioriza el pedido en curso/abierto sobre "lo de siempre".
  const productos = await listarProductos(empresaId);
  const enCurso = baseLineas.length ? baseLineas : conv?.lineas ?? [];
  let ultimoPedido: { nombre: string; cantidad: number }[] | undefined;
  if (enCurso.length === 0) {
    const ultimo = await ultimoPedidoCliente(empresaId, clienteId);
    const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
    ultimoPedido = ultimo.map((u) => ({ nombre: prodPorId.get(u.productoId) ?? `#${u.productoId}`, cantidad: u.cantidad }));
  }

  const r = await interpretarPedido(empresaId, clienteId, entrada, {
    clienteNombre,
    ultimoPedido,
    borradorPrevio: enCurso.length ? enCurso.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })) : undefined,
    historial: conv?.historial,
  });

  const lineas: LineaGuardada[] = r.propuesta.lineas.map((l) => ({ productoId: l.productoId, nombre: l.nombre, unidad: l.unidad, cantidad: l.cantidad, precioUnitario: l.precioUnitario }));

  // 4) Decidir respuesta y estado.
  let respuesta: RespuestaTurno;
  let estado = conv?.estado === "confirmado" ? "confirmado" : "recolectando";
  const lineasGuardar = lineas.length > 0 ? lineas : enCurso;

  if (lineas.length > 0 && r.completo) {
    estado = "confirmando";
    const intro = ampliando ? "Actualicé tu pedido:" : "";
    respuesta = { texto: `${intro ? intro + "\n\n" : ""}${r.propuesta.resumen}\n\n¿Confirmo tu pedido? Toca un botón o responde *sí*.`, botones: [BTN_CONFIRMAR, BTN_CANCELAR] };
  } else if (lineas.length > 0) {
    estado = "recolectando";
    respuesta = { texto: r.mensajeAsistente };
  } else {
    // Sin productos nuevos. Si hay un pedido confirmado abierto, lo recordamos.
    respuesta = { texto: ampliando ? `${r.mensajeAsistente}\n\n(Tu pedido de hoy sigue abierto; si quieres, dime qué le sumo.)` : r.mensajeAsistente };
  }

  // 5) Guardar borrador + historial (acotado) para el próximo turno.
  const entradaTexto = entrada.texto ?? (entrada.imagenes?.length ? "(envió una imagen)" : "");
  const historial = [...(conv?.historial ?? [])];
  if (entradaTexto) historial.push({ rol: "user", texto: entradaTexto });
  historial.push({ rol: "assistant", texto: respuesta.texto });
  // Preservamos la cotización en ampliación aunque aún esté incompleta.
  const cotizacionId = ampliando ?? conv?.cotizacionId;
  await guardarConversacion(empresaId, telefono, lineasGuardar, historial.slice(-8), estado, cotizacionId);

  return respuesta;
}
