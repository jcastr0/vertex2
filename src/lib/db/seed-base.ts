/**
 * Seed BASE — data transversal del sistema, igual para TODAS las empresas.
 *
 * Siembra solo los catálogos fijos que no dependen de ninguna empresa:
 *   - Nomenclatura (vx00)         — registro de tablas del sistema
 *   - Roles y permisos (vx01)     — fuente de verdad de permisos por rol
 *   - Unidades de medida          — kg, libra, arroba, bulto…
 *   - Bancos de Colombia (vx36)   — maestro para elegir banco en las cuentas
 *
 * NO crea empresas, usuarios ni data de demo. Es seguro correrlo en producción
 * sobre una base existente: todo es idempotente (upsert por clave única).
 *
 *   pnpm db:seed:base
 *
 * `sembrarBase(db)` es reutilizable: el seed de demo (seed.ts) lo llama antes de
 * agregar su data de prueba, para no duplicar estos catálogos.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pathToFileURL } from "node:url";
import * as schema from "./schema";
import { ROLES } from "@/lib/auth/roles";
import { CATALOGO } from "./nomenclatura";
import { BANCOS_CO } from "./bancos-co";

type DB = PostgresJsDatabase<typeof schema>;

export const UNIDADES = [
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

/** Siembra la data transversal del sistema. Idempotente. */
export async function sembrarBase(db: DB): Promise<void> {
  console.log("→ Nomenclatura (vx00)…");
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

  console.log("→ Roles y permisos (vx01)…");
  for (const [nombre, permisos] of Object.entries(ROLES)) {
    // La fuente de verdad de los permisos vive en la BD (vx01.permisos). Los
    // roles del sistema se re-siembran desde el código para que su matriz
    // refleje los permisos base. Los roles creados a mano por el usuario, al no
    // estar en ROLES, no se tocan.
    await db
      .insert(schema.roles)
      .values({ nombre, descripcion: `Rol ${nombre}`, permisos: [...permisos] })
      .onConflictDoUpdate({
        target: schema.roles.nombre,
        set: { permisos: [...permisos] },
      });
  }

  console.log("→ Unidades de medida…");
  for (const u of UNIDADES) {
    await db.insert(schema.unidadesMedida).values(u).onConflictDoNothing({
      target: schema.unidadesMedida.codigo,
    });
  }

  console.log("→ Bancos de Colombia (vx36)…");
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
}

/** Ejecución directa: `pnpm db:seed:base`. No corre cuando se importa desde otro seed. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL no definida. Configúrala antes de sembrar.");
    process.exit(1);
  }
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  console.log("→ Sembrando data transversal del sistema…");
  await sembrarBase(db);
  console.log("✓ Data base lista: nomenclatura, roles/permisos, unidades y bancos.");
  await client.end();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("✗ Error en el seed base:", e);
    process.exit(1);
  });
}
