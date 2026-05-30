import "server-only";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "evidencias";

function client() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_STORAGE_VERTEX_VERTEXSUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STORAGE_VERTEX_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage no está configurado (URL/clave faltante).");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Sube una imagen de evidencia al bucket público `evidencias` y devuelve su URL.
 * Crea el bucket si no existe.
 */
export async function subirEvidencia(file: File, ruta: string): Promise<string> {
  const sb = client();
  // Asegura el bucket (idempotente: ignora "ya existe").
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from(BUCKET).upload(ruta, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}
