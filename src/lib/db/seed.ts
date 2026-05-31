/**
 * Seed de DEMO de Vertex (entorno de desarrollo). Idempotente.
 *
 * Siembra primero la data transversal del sistema vía `sembrarBase()` (ver
 * seed-base.ts) y luego agrega una empresa y usuarios de prueba. Para producción
 * usar solo `pnpm db:seed:base` (sin data de demo).
 *
 *   pnpm db:seed
 *   Superadmin:  admin@vertex.co  /  SEED_ADMIN_PASSWORD (def. Vertex2026!)
 *   Admin demo:  admin@demo.co    /  misma contraseña
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { sembrarBase } from "./seed-base";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL no definida. Configúrala antes de sembrar.");
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log("→ Sembrando data transversal del sistema…");
  await sembrarBase(db);

  console.log("→ Sembrando empresa demo…");
  await db
    .insert(schema.empresas)
    .values({
      nombre: "Empresa Demo",
      razonSocial: "Empresa Demo S.A.S.",
      nit: "900000000",
      email: "contacto@demo.co",
      ciudad: "Bogotá",
      pais: "Colombia",
    })
    .onConflictDoNothing({ target: schema.empresas.nombre });

  const [empresaDemo] = await db
    .select()
    .from(schema.empresas)
    .where(eq(schema.empresas.nombre, "Empresa Demo"))
    .limit(1);

  const passwordPlano = process.env.SEED_ADMIN_PASSWORD ?? "Vertex2026!";
  const passwordHash = await hashPassword(passwordPlano);

  console.log("→ Sembrando superadmin…");
  await db
    .insert(schema.usuarios)
    .values({
      nombre: "Super Administrador",
      email: "admin@vertex.co",
      password: passwordHash,
      esSuperadmin: true,
      activo: true,
    })
    .onConflictDoNothing({ target: schema.usuarios.email });

  console.log("→ Sembrando admin de la empresa demo…");
  await db
    .insert(schema.usuarios)
    .values({
      nombre: "Administrador Demo",
      email: "admin@demo.co",
      password: passwordHash,
      empresaId: empresaDemo.id,
      activo: true,
    })
    .onConflictDoNothing({ target: schema.usuarios.email });

  const [adminDemo] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.email, "admin@demo.co"))
    .limit(1);
  const [rolAdmin] = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.nombre, "Admin"))
    .limit(1);

  if (adminDemo && rolAdmin && empresaDemo) {
    await db
      .insert(schema.usuariosEmpresas)
      .values({ usuarioId: adminDemo.id, empresaId: empresaDemo.id, rolId: rolAdmin.id })
      .onConflictDoNothing();
  }

  console.log("✓ Seed completado.");
  console.log(`  Superadmin: admin@vertex.co / ${passwordPlano}`);
  console.log(`  Admin demo: admin@demo.co / ${passwordPlano}`);
  await client.end();
}

main().catch(async (e) => {
  console.error("✗ Error en el seed:", e);
  await client.end();
  process.exit(1);
});
