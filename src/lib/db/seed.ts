/**
 * Seed de datos base de Vertex. Idempotente: usa onConflictDoNothing sobre las
 * claves únicas. Ejecutar con `pnpm db:seed` (requiere DATABASE_URL).
 *
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
import { ROLES } from "@/lib/auth/roles";
import { hashPassword } from "@/lib/auth/password";
import { CATALOGO } from "./nomenclatura";
import { BANCOS_CO } from "./bancos-co";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL no definida. Configúrala antes de sembrar.");
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

const UNIDADES = [
  { codigo: "UND", nombre: "Unidad", abreviatura: "und", tipo: "cantidad" },
  { codigo: "KG", nombre: "Kilogramo", abreviatura: "kg", tipo: "peso" },
  { codigo: "LB", nombre: "Libra", abreviatura: "lb", tipo: "peso" },
  { codigo: "AR", nombre: "Arroba", abreviatura: "@", tipo: "peso" },
  { codigo: "GR", nombre: "Gramo", abreviatura: "g", tipo: "peso" },
  { codigo: "BUL", nombre: "Bulto", abreviatura: "bul", tipo: "cantidad" },
  { codigo: "CAJ", nombre: "Caja", abreviatura: "caj", tipo: "cantidad" },
  { codigo: "DOC", nombre: "Docena", abreviatura: "doc", tipo: "cantidad" },
  { codigo: "LT", nombre: "Litro", abreviatura: "L", tipo: "volumen" },
  { codigo: "GL", nombre: "Galón", abreviatura: "gal", tipo: "volumen" },
];

async function main() {
  console.log("→ Sembrando nomenclatura (vx00)…");
  for (let i = 0; i < CATALOGO.length; i++) {
    const e = CATALOGO[i];
    await db
      .insert(schema.nomenclatura)
      .values({
        codigo: e.codigo,
        nombreModelo: e.nombreModelo,
        descripcion: e.descripcion,
        modulo: e.modulo,
        tieneEmpresaId: e.tieneEmpresaId,
        esCatalogo: e.esCatalogo,
        orden: i + 1,
      })
      .onConflictDoUpdate({
        target: schema.nomenclatura.codigo,
        set: {
          nombreModelo: e.nombreModelo,
          descripcion: e.descripcion,
          modulo: e.modulo,
          tieneEmpresaId: e.tieneEmpresaId,
          esCatalogo: e.esCatalogo,
          orden: i + 1,
          updatedAt: new Date(),
        },
      });
  }

  console.log("→ Sembrando roles…");
  for (const [nombre, permisos] of Object.entries(ROLES)) {
    // Upsert de permisos: la fuente de verdad vive en la BD (vx01.permisos), pero
    // los roles del sistema se re-siembran desde el código para que su matriz
    // refleje los permisos base. Los roles creados a mano por el usuario no se tocan.
    await db
      .insert(schema.roles)
      .values({ nombre, descripcion: `Rol ${nombre}`, permisos: [...permisos] })
      .onConflictDoUpdate({
        target: schema.roles.nombre,
        set: { permisos: [...permisos] },
      });
  }

  console.log("→ Sembrando unidades de medida…");
  for (const u of UNIDADES) {
    await db.insert(schema.unidadesMedida).values(u).onConflictDoNothing({
      target: schema.unidadesMedida.codigo,
    });
  }

  console.log("→ Sembrando bancos (vx36)…");
  for (let i = 0; i < BANCOS_CO.length; i++) {
    const b = BANCOS_CO[i];
    await db
      .insert(schema.bancos)
      .values({ codigo: b.codigo, nombre: b.nombre, tipo: b.tipo, orden: i + 1 })
      .onConflictDoUpdate({
        target: schema.bancos.codigo,
        set: { nombre: b.nombre, tipo: b.tipo, orden: i + 1, updatedAt: new Date() },
      });
  }

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
