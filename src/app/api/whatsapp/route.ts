import { after, type NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
    after(() => atender(m).catch((e) => console.error("[whatsapp] error al atender:", (e as Error).message)));
  }
  // Meta exige 200 rápido; si no, reintenta y duplica mensajes.
  return NextResponse.json({ ok: true });
}

async function atender(m: MensajeEntrante): Promise<void> {
  const empresaId = await empresaPorPhoneNumberId(m.phoneNumberId);
  if (!empresaId) return; // el número no pertenece a ninguna empresa nuestra

  const cliente = await buscarClientePorTelefono(empresaId, m.from);

  // Política: solo clientes registrados. Desconocido → mensaje de registro + guardar solicitud.
  if (!cliente) {
    const [texto] = await Promise.all([
      mensajeNoRegistrado(empresaId),
      registrarSolicitud(empresaId, m.from, m.texto ?? "(imagen)"),
    ]);
    await enviarTexto(empresaId, m.from, texto);
    return;
  }

  if (!(await botActivo(empresaId))) return; // bot apagado: no respondemos

  const imagenes: ImagenEntrada[] = [];
  if (m.imagenMediaId) {
    const img = await descargarImagen(empresaId, m.imagenMediaId);
    if (img) imagenes.push(img);
  }
  if (!m.texto && imagenes.length === 0) return; // nada que interpretar

  const nombre = cliente.nombreComercial ?? cliente.razonSocial;
  const respuesta = await procesarTurnoWhatsApp(empresaId, cliente.id, nombre, m.from, {
    texto: m.texto,
    imagenes,
  });
  await enviarTexto(empresaId, m.from, respuesta);
}
