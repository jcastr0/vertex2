import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado de secretos en reposo (AES-256-GCM). La llave maestra vive en env
 * (CONFIG_SECRET) y NUNCA en la base de datos. El blob guardado es inservible
 * sin esa llave. Formato: base64url(iv).base64url(tag).base64url(ciphertext).
 */
function llave(): Buffer {
  const secreto = process.env.CONFIG_SECRET;
  if (!secreto) throw new Error("Falta CONFIG_SECRET (llave maestra para cifrar secretos).");
  // Deriva 32 bytes determinísticos desde el secreto maestro.
  return createHash("sha256").update(secreto).digest();
}

const b64 = (b: Buffer) => b.toString("base64url");
const fromB64 = (s: string) => Buffer.from(s, "base64url");

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", llave(), iv);
  const ct = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${b64(iv)}.${b64(tag)}.${b64(ct)}`;
}

export function descifrar(blob: string): string {
  const [iv, tag, ct] = blob.split(".");
  if (!iv || !tag || !ct) throw new Error("Blob cifrado inválido.");
  const decipher = createDecipheriv("aes-256-gcm", llave(), fromB64(iv));
  decipher.setAuthTag(fromB64(tag));
  return Buffer.concat([decipher.update(fromB64(ct)), decipher.final()]).toString("utf8");
}
