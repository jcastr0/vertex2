import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** Genera el hash bcrypt de una contraseña en texto plano. */
export async function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, ROUNDS);
}

/** Verifica una contraseña en texto plano contra su hash bcrypt. */
export async function verifyPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}
