/**
 * Seed de prueba para RUTA DE RECAUDO — Vertex (demo).
 * Crea 2 recaudadores, los asigna a clientes con saldo y les pone día de cobro.
 * La "ruta" se arma sola en /ruta-recaudo a partir de estas asignaciones.
 *
 * Idempotente. Pre-requisito: `npm run db:seed` y `npm run db:seed:demo`.
 * Uso:  npx tsx src/lib/db/seed-ruta.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, inArray, sql } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";

const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL;
if (!url) { console.error("✗ DATABASE_URL no definida."); process.exit(1); }
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const money = (n: number) => "$" + n.toLocaleString("es-CO");

const RECAUDADORES = [
  { nombre: "Carlos Ruta", email: "carlos.ruta@demo.co" },
  { nombre: "Marta Cobros", email: "marta.cobros@demo.co" },
];

async function main() {
  const [empresa] = await db.select().from(schema.empresas).where(eq(schema.empresas.nombre, "Empresa Demo")).limit(1);
  if (!empresa) { console.error("✗ No existe Empresa Demo. Corre db:seed:demo primero."); process.exit(1); }
  const E = empresa.id;

  // Rol para los recaudadores (preferir Vendedor; si no, el primero disponible).
  const roles = await db.select().from(schema.roles);
  const rol = roles.find((r) => r.nombre === "Vendedor") ?? roles.find((r) => r.nombre !== "SuperAdmin") ?? roles[0];
  const passwordHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "Vertex2026!");

  console.log("→ Creando recaudadores…");
  for (const r of RECAUDADORES) {
    const [u] = await db
      .insert(schema.usuarios)
      .values({ empresaId: E, nombre: r.nombre, email: r.email, password: passwordHash, activo: true, esRecaudador: true })
      .onConflictDoNothing({ target: schema.usuarios.email })
      .returning();
    // Si ya existía, asegurar esRecaudador=true.
    const [usr] = u ? [u] : await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, r.email)).limit(1);
    if (!u) await db.update(schema.usuarios).set({ esRecaudador: true }).where(eq(schema.usuarios.id, usr.id));
    await db.insert(schema.usuariosEmpresas).values({ usuarioId: usr.id, empresaId: E, rolId: rol.id }).onConflictDoNothing();
    console.log(`  ✓ ${r.nombre} (${r.email}) id=${usr.id}`);
  }

  const recs = await db.select().from(schema.usuarios).where(and(eq(schema.usuarios.empresaId, E), inArray(schema.usuarios.email, RECAUDADORES.map((r) => r.email))));

  // Clientes con saldo, para asignarles recaudador + día.
  const clientes = await db
    .select({ id: schema.terceros.id, nombre: schema.terceros.razonSocial, saldo: sql<string>`coalesce(sum(${schema.cuentasPorCobrar.saldoPendiente}), 0)` })
    .from(schema.terceros)
    .leftJoin(schema.cuentasPorCobrar, eq(schema.cuentasPorCobrar.clienteId, schema.terceros.id))
    .where(and(eq(schema.terceros.empresaId, E), inArray(schema.terceros.tipo, ["cliente", "ambos"])))
    .groupBy(schema.terceros.id, schema.terceros.razonSocial);
  const conSaldo = clientes.filter((c) => Number(c.saldo) > 0);

  console.log(`→ Asignando ${conSaldo.length} cliente(s) con saldo a la ruta…`);
  const diasCiclo = [1, 2, 3, 5]; // Lun, Mar, Mié, Vie
  for (let i = 0; i < conSaldo.length; i++) {
    const c = conSaldo[i];
    const rec = recs[i % recs.length];
    const dia = diasCiclo[i % diasCiclo.length];
    await db.update(schema.terceros).set({ recaudadorId: rec.id, diaCobro: dia }).where(eq(schema.terceros.id, c.id));
  }

  // Reporte de la ruta resultante por recaudador.
  console.log("\n========== RUTAS ARMADAS ==========");
  for (const rec of recs) {
    const asignados = conSaldo
      .map((c, i) => ({ c, rec: recs[i % recs.length], dia: diasCiclo[i % diasCiclo.length] }))
      .filter((x) => x.rec.id === rec.id);
    console.log(`\n${rec.nombre} (${rec.email}) — ${asignados.length} cliente(s):`);
    for (const a of asignados) {
      console.log(`   · ${DIAS[a.dia]}: ${a.c.nombre} — debe ${money(Number(a.c.saldo))}`);
    }
  }
  console.log("\nContraseña de los recaudadores: " + (process.env.SEED_ADMIN_PASSWORD ?? "Vertex2026!"));
  console.log("Ábrelo en  Cartera → Ruta de recaudo  y elige el recaudador arriba.");
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e); process.exit(1); });
