import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";

const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL;
if (!url) { console.error("✗ DATABASE_URL no definida."); process.exit(1); }
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

const EMPRESAS = [
  { nombre: "Verdulería El Campo", razonSocial: "Verdulería El Campo S.A.S.", nit: "901111111", email: "campo@demo.co", paletaTema: "bosque", admin: "campo@demo.co" },
  { nombre: "Frutas del Valle", razonSocial: "Frutas del Valle S.A.S.", nit: "902222222", email: "valle@demo.co", paletaTema: "mandarina", admin: "valle@demo.co" },
  { nombre: "Mercado Central", razonSocial: "Mercado Central S.A.S.", nit: "903333333", email: "central@demo.co", paletaTema: "oceano", admin: "central@demo.co" },
];

async function main() {
  const roles = await db.select().from(schema.roles);
  const rolAdmin = roles.find((r) => r.nombre === "Admin") ?? roles[0];
  const hash = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "Vertex2026!");

  for (const e of EMPRESAS) {
    let [emp] = await db.select().from(schema.empresas).where(eq(schema.empresas.nombre, e.nombre)).limit(1);
    if (!emp) {
      [emp] = await db.insert(schema.empresas).values({ nombre: e.nombre, razonSocial: e.razonSocial, nit: e.nit, email: e.email, pais: "Colombia", paletaTema: e.paletaTema }).returning();
    } else {
      await db.update(schema.empresas).set({ paletaTema: e.paletaTema }).where(eq(schema.empresas.id, emp.id));
    }
    let [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, e.admin)).limit(1);
    if (!u) {
      [u] = await db.insert(schema.usuarios).values({ empresaId: emp.id, nombre: `Admin ${e.nombre}`, email: e.admin, password: hash, activo: true }).returning();
    }
    await db.insert(schema.usuariosEmpresas).values({ usuarioId: u.id, empresaId: emp.id, rolId: rolAdmin.id }).onConflictDoNothing();
    console.log(`  ✓ ${e.nombre} (paleta ${e.paletaTema}) — admin ${e.admin}`);
  }
  console.log("Listo. Entra como superadmin (admin@vertex.co) y cambia de empresa para ver los temas.");
  process.exit(0);
}
main().catch((err) => { console.error("✗", err); process.exit(1); });
