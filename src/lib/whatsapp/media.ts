import "server-only";
import { whatsappToken } from "@/lib/services/configuracion";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Descarga una imagen que el cliente envió por WhatsApp (Meta entrega un media id):
 * 1) resuelve la URL temporal del media, 2) descarga los bytes (ambas con el token),
 * y devuelve un data URL base64 listo para la visión de Claude. null si falla.
 */
export async function descargarImagen(empresaId: number, mediaId: string): Promise<{ dataUrl: string } | null> {
  const token = await whatsappToken(empresaId);
  if (!token) return null;
  try {
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!meta.ok) return null;
    const info = (await meta.json()) as { url?: string; mime_type?: string };
    if (!info.url) return null;
    const bin = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!bin.ok) return null;
    const buf = Buffer.from(await bin.arrayBuffer());
    const mt = info.mime_type || "image/jpeg";
    return { dataUrl: `data:${mt};base64,${buf.toString("base64")}` };
  } catch (e) {
    console.error("[whatsapp] error al descargar media:", (e as Error).message);
    return null;
  }
}
