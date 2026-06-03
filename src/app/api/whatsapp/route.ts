import { type NextRequest, NextResponse } from "next/server";
import { parsearMensajeEntrante, type MensajeEntrante } from "@/lib/domain/whatsapp";
import { empresaPorPhoneNumberId, botActivo, mensajeNoRegistrado } from "@/lib/services/configuracion";
import { buscarClientePorTelefono } from "@/lib/services/terceros";
import { registrarSolicitud } from "@/lib/services/solicitudes-registro";
import { procesarTurnoWhatsApp } from "@/lib/bot/turno-whatsapp";
import { enviarTexto } from "@/lib/whatsapp/enviar";
import { descargarImagen } from "@/lib/whatsapp/media";
import type { ImagenEntrada } from "@/lib/bot/cliente-claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verificación del webhook (Meta hace un GET con hub.* al suscribir la URL). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Recepción de mensajes. Responde 200 de inmediato y procesa en segundo plano. */
export async function POST(req: NextRequest) {
  let mensaje: MensajeEntrante | null = null;
  try {
    mensaje = parsearMensajeEntrante(await req.json());
  } catch {
    mensaje = null;
  }
  if (mensaje) {
    const m = mensaje;
    console.log("[wa] entrante", { phoneNumberId: m.phoneNumberId, de: m.from, tipo: m.texto ? "texto" : m.imagenMediaId ? "imagen" : "otro" });
    // Procesamos ANTES de responder: en Vercel el trabajo en `after()` se
    // descarta cuando la función se congela tras el 200. Claude Haiku tarda
    // pocos segundos, dentro del margen de Meta.
    try {
      await atender(m);
    } catch (e) {
      console.error("[wa] error al atender:", (e as Error).message);
    }
  } else {
    console.log("[wa] POST ignorado (sin mensaje útil: status update o payload no reconocido)");
  }
  return NextResponse.json({ ok: true });
}

async function atender(m: MensajeEntrante): Promise<void> {
  const empresaId = await empresaPorPhoneNumberId(m.phoneNumberId);
  if (!empresaId) {
    console.log("[wa] phoneNumberId sin empresa configurada:", m.phoneNumberId, "→ revisa Configuración > WhatsApp");
    return;
  }

  const cliente = await buscarClientePorTelefono(empresaId, m.from);
  console.log("[wa] empresa", empresaId, "cliente", cliente ? `#${cliente.id}` : "DESCONOCIDO");

  // Política: solo clientes registrados. Desconocido → mensaje de registro + guardar solicitud.
  if (!cliente) {
    const [texto] = await Promise.all([
      mensajeNoRegistrado(empresaId),
      registrarSolicitud(empresaId, m.from, m.texto ?? "(imagen)"),
    ]);
    const ok = await enviarTexto(empresaId, m.from, texto);
    console.log("[wa] respondido mensaje no-registrado:", ok ? "enviado" : "FALLÓ el envío");
    return;
  }

  if (!(await botActivo(empresaId))) {
    console.log("[wa] bot apagado para empresa", empresaId, "→ no se responde");
    return;
  }

  const imagenes: ImagenEntrada[] = [];
  if (m.imagenMediaId) {
    const img = await descargarImagen(empresaId, m.imagenMediaId);
    if (img) imagenes.push(img);
    else console.log("[wa] no se pudo descargar la imagen", m.imagenMediaId);
  }
  if (!m.texto && imagenes.length === 0) {
    console.log("[wa] nada que interpretar (sin texto ni imagen usable)");
    return;
  }

  const nombre = cliente.nombreComercial ?? cliente.razonSocial;
  const respuesta = await procesarTurnoWhatsApp(empresaId, cliente.id, nombre, m.from, {
    texto: m.texto,
    imagenes,
  });
  const ok = await enviarTexto(empresaId, m.from, respuesta);
  console.log("[wa] respuesta del bot:", ok ? "enviada" : "FALLÓ el envío", "—", respuesta.slice(0, 80));
}
