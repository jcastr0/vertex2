/**
 * Seed de datos DEMO para mercado de verduras — Vertex.
 * Idempotente: usa onConflictDoNothing sobre las claves únicas de cada tabla.
 *
 * Pre-requisito: ejecutar `npm run db:seed` antes (crea Empresa Demo, KG, roles).
 *
 * Uso:  npm run db:seed:demo
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";

const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL no definida.");
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

// ── Datos de verduras/frutas ────────────────────────────────────────────────
const PRODUCTOS_DEMO = [
  {
    sku: "VRD-001",
    nombre: "Tomate chonto",
    descripcion: "Tomate chonto fresco, ideal para ensaladas y salsas.",
    precioCompraSugerido: "2800",
    precioVenta: "3500",
    stockInicial: "150",
    costoPromedio: "2800",
    categoriaKey: "verduras",
    clasificacionAbc: "A",
  },
  {
    sku: "VRD-002",
    nombre: "Cebolla cabezona",
    descripcion: "Cebolla cabezona blanca, excelente para cocción.",
    precioCompraSugerido: "1800",
    precioVenta: "2500",
    stockInicial: "120",
    costoPromedio: "1800",
    categoriaKey: "verduras",
    clasificacionAbc: "A",
  },
  {
    sku: "VRD-003",
    nombre: "Papa criolla",
    descripcion: "Papa criolla colombiana, sabor característico.",
    precioCompraSugerido: "2200",
    precioVenta: "3000",
    stockInicial: "200",
    costoPromedio: "2200",
    categoriaKey: "verduras",
    clasificacionAbc: "A",
  },
  {
    sku: "VRD-004",
    nombre: "Zanahoria",
    descripcion: "Zanahoria fresca, rica en betacaroteno.",
    precioCompraSugerido: "1500",
    precioVenta: "2200",
    stockInicial: "100",
    costoPromedio: "1500",
    categoriaKey: "verduras",
    clasificacionAbc: "B",
  },
  {
    sku: "VRD-005",
    nombre: "Lechuga batavia",
    descripcion: "Lechuga batavia fresca, hoja crocante.",
    precioCompraSugerido: "1200",
    precioVenta: "2000",
    stockInicial: "60",
    costoPromedio: "1200",
    categoriaKey: "verduras",
    clasificacionAbc: "B",
  },
  {
    sku: "FRT-001",
    nombre: "Aguacate Hass",
    descripcion: "Aguacate Hass maduro, cremoso y de alta calidad.",
    precioCompraSugerido: "5500",
    precioVenta: "7500",
    stockInicial: "80",
    costoPromedio: "5500",
    categoriaKey: "frutas",
    clasificacionAbc: "A",
  },
  {
    sku: "FRT-002",
    nombre: "Plátano",
    descripcion: "Plátano hartón verde, para cocinar y freír.",
    precioCompraSugerido: "1800",
    precioVenta: "2600",
    stockInicial: "180",
    costoPromedio: "1800",
    categoriaKey: "frutas",
    clasificacionAbc: "A",
  },
  {
    sku: "FRT-003",
    nombre: "Limón Tahití",
    descripcion: "Limón Tahití sin semilla, jugoso y aromático.",
    precioCompraSugerido: "2500",
    precioVenta: "3800",
    stockInicial: "90",
    costoPromedio: "2500",
    categoriaKey: "frutas",
    clasificacionAbc: "B",
  },
];

const TERCEROS_DEMO = [
  {
    codigo: "CLI-001",
    razonSocial: "Restaurante La Fonda",
    nombreComercial: "La Fonda Paisa",
    tipo: "cliente" as const,
    tipoIdentificacion: "NIT" as const,
    identificacion: "800100001",
    tipoPersona: "juridica" as const,
    telefono: "6011234567",
    ciudad: "Bogotá",
    observaciones: "Cliente mayorista, maneja crédito a 15 días.",
    diasCreditoCliente: 15,
    cupoCredito: "500000",
  },
  {
    codigo: "CLI-002",
    razonSocial: "Tienda Doña Mary",
    nombreComercial: "Tienda Doña Mary",
    tipo: "cliente" as const,
    tipoIdentificacion: "CC" as const,
    identificacion: "52100002",
    tipoPersona: "natural" as const,
    telefono: "3101234567",
    ciudad: "Bogotá",
    observaciones: "Cliente minorista, pago de contado.",
    diasCreditoCliente: 0,
    cupoCredito: "0",
  },
  {
    codigo: "CLI-003",
    razonSocial: "Cliente Ocasional",
    nombreComercial: "Cliente Ocasional",
    tipo: "cliente" as const,
    tipoIdentificacion: "CC" as const,
    identificacion: "99999003",
    tipoPersona: "natural" as const,
    telefono: null,
    ciudad: "Bogotá",
    observaciones: "Cliente genérico para ventas al detal sin identificar.",
    diasCreditoCliente: 0,
    cupoCredito: "0",
  },
  {
    codigo: "PRV-001",
    razonSocial: "Distribuidora Central de Abastos",
    nombreComercial: "Central de Abastos",
    tipo: "proveedor" as const,
    tipoIdentificacion: "NIT" as const,
    identificacion: "830400004",
    tipoPersona: "juridica" as const,
    telefono: "6014567890",
    ciudad: "Bogotá",
    observaciones: "Proveedor principal de frutas y verduras, plaza de mercado.",
    diasCreditoCliente: 0,
    cupoCredito: "0",
  },
];

async function main() {
  // ── 1. Obtener Empresa Demo ─────────────────────────────────────────────────
  const [empresaDemo] = await db
    .select()
    .from(schema.empresas)
    .where(eq(schema.empresas.nombre, "Empresa Demo"))
    .limit(1);

  if (!empresaDemo) {
    console.error('✗ "Empresa Demo" no encontrada. Ejecuta primero: npm run db:seed');
    await client.end();
    process.exit(1);
  }

  const E = empresaDemo.id;
  console.log(`→ Empresa Demo id=${E}`);

  // ── 2. Obtener unidad KG ────────────────────────────────────────────────────
  const [unidadKG] = await db
    .select()
    .from(schema.unidadesMedida)
    .where(eq(schema.unidadesMedida.codigo, "KG"))
    .limit(1);

  if (!unidadKG) {
    console.error('✗ Unidad "KG" no encontrada. Ejecuta primero: npm run db:seed');
    await client.end();
    process.exit(1);
  }

  const kgId = unidadKG.id;
  console.log(`→ Unidad KG id=${kgId}`);

  // ── 3. Bodega principal ─────────────────────────────────────────────────────
  console.log("→ Sembrando bodega principal…");
  await db
    .insert(schema.bodegas)
    .values({
      empresaId: E,
      codigo: "BOD-01",
      nombre: "Bodega Principal",
      direccion: "Plaza de mercado local, puesto 12",
      responsable: "Administrador Demo",
      esPrincipal: true,
      activo: true,
    })
    .onConflictDoNothing({
      target: [schema.bodegas.empresaId, schema.bodegas.codigo],
    });

  const [bodega] = await db
    .select()
    .from(schema.bodegas)
    .where(and(eq(schema.bodegas.empresaId, E), eq(schema.bodegas.codigo, "BOD-01")))
    .limit(1);

  console.log(`  ✓ Bodega id=${bodega.id}`);

  // ── 4. Categorías ────────────────────────────────────────────────────────────
  // vx08 no tiene unique constraint en (empresaId, nombre), así que usamos
  // "insert only if not exists" manual para garantizar idempotencia.
  console.log("→ Sembrando categorías…");
  const CATS_DEMO: { nombre: string; descripcion: string; tipo: "producto" | "gasto" }[] = [
    { nombre: "Verduras", descripcion: "Hortalizas y verduras frescas", tipo: "producto" },
    { nombre: "Frutas", descripcion: "Frutas frescas de temporada", tipo: "producto" },
    // Categorías de gasto (para costos de pedido: flete, gasolina…).
    { nombre: "Flete", descripcion: "Transporte de la mercancía", tipo: "gasto" },
    { nombre: "Gasolina", descripcion: "Combustible", tipo: "gasto" },
    { nombre: "Transporte", descripcion: "Otros transportes", tipo: "gasto" },
    { nombre: "Descargue", descripcion: "Mano de obra de descargue", tipo: "gasto" },
    { nombre: "Empaque", descripcion: "Bolsas, canastillas, costales", tipo: "gasto" },
    { nombre: "Hielo", descripcion: "Hielo / cadena de frío", tipo: "gasto" },
    { nombre: "Peajes", descripcion: "Peajes de ruta", tipo: "gasto" },
    { nombre: "Otros gastos", descripcion: "Gastos varios del pedido", tipo: "gasto" },
  ];
  for (const cat of CATS_DEMO) {
    const existing = await db
      .select()
      .from(schema.categoriasProductos)
      .where(
        and(
          eq(schema.categoriasProductos.empresaId, E),
          eq(schema.categoriasProductos.nombre, cat.nombre),
        ),
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.categoriasProductos).values({
        empresaId: E,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        tipo: cat.tipo,
      });
    }
  }

  // Obtener categorías por nombre para asociarlas a productos
  const categoriaRows = await db
    .select()
    .from(schema.categoriasProductos)
    .where(eq(schema.categoriasProductos.empresaId, E));

  const catMap: Record<string, number> = {};
  for (const c of categoriaRows) {
    if (c.nombre === "Verduras") catMap["verduras"] = c.id;
    if (c.nombre === "Frutas") catMap["frutas"] = c.id;
  }
  console.log(`  ✓ Categorías: Verduras id=${catMap["verduras"]}, Frutas id=${catMap["frutas"]}`);

  // ── 5. Productos ─────────────────────────────────────────────────────────────
  console.log("→ Sembrando productos…");
  for (const p of PRODUCTOS_DEMO) {
    await db
      .insert(schema.productos)
      .values({
        empresaId: E,
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoriaId: catMap[p.categoriaKey],
        unidadBaseId: kgId,
        precioCompraSugerido: p.precioCompraSugerido,
        stockMinimo: "5",
        clasificacionAbc: p.clasificacionAbc,
        activo: true,
      })
      .onConflictDoNothing({
        target: [schema.productos.empresaId, schema.productos.sku],
      });
  }

  // Obtener todos los productos insertados para la empresa
  const productosInsertados = await db
    .select()
    .from(schema.productos)
    .where(eq(schema.productos.empresaId, E));

  const prodMap: Record<string, typeof productosInsertados[0]> = {};
  for (const p of productosInsertados) {
    prodMap[p.sku] = p;
  }
  console.log(`  ✓ Productos encontrados: ${productosInsertados.length}`);

  // ── 6. productoUnidades (vx11) — fila base KG por cada producto ─────────────
  console.log("→ Sembrando productoUnidades (base KG)…");
  for (const p of PRODUCTOS_DEMO) {
    const prod = prodMap[p.sku];
    if (!prod) {
      console.warn(`  ⚠ Producto ${p.sku} no encontrado, omitiendo productoUnidades.`);
      continue;
    }
    await db
      .insert(schema.productoUnidades)
      .values({
        productoId: prod.id,
        unidadId: kgId,
        factorConversion: "1",
        precioVenta: p.precioVenta,
        esPrecioCalculado: false,
        permiteCompra: true,
        permiteVenta: true,
      })
      .onConflictDoNothing({
        target: [schema.productoUnidades.productoId, schema.productoUnidades.unidadId],
      });
  }
  console.log(`  ✓ productoUnidades sembradas`);

  // ── 7. Inventario (vx16) ─────────────────────────────────────────────────────
  console.log("→ Sembrando inventario…");
  for (const p of PRODUCTOS_DEMO) {
    const prod = prodMap[p.sku];
    if (!prod) {
      console.warn(`  ⚠ Producto ${p.sku} no encontrado, omitiendo inventario.`);
      continue;
    }
    const cantidad = p.stockInicial;
    const costo = p.costoPromedio;
    const valorTotal = String(Number(cantidad) * Number(costo));

    await db
      .insert(schema.inventario)
      .values({
        empresaId: E,
        bodegaId: bodega.id,
        productoId: prod.id,
        cantidadActual: cantidad,
        costoPromedio: costo,
        valorTotal: valorTotal,
        ultimaActualizacion: new Date(),
      })
      .onConflictDoNothing({
        target: [schema.inventario.empresaId, schema.inventario.bodegaId, schema.inventario.productoId],
      });
  }
  console.log(`  ✓ Inventario sembrado`);

  // ── 8. Terceros (clientes + proveedor) ───────────────────────────────────────
  console.log("→ Sembrando terceros…");
  for (const t of TERCEROS_DEMO) {
    await db
      .insert(schema.terceros)
      .values({
        empresaId: E,
        tipo: t.tipo,
        codigo: t.codigo,
        razonSocial: t.razonSocial,
        nombreComercial: t.nombreComercial,
        tipoIdentificacion: t.tipoIdentificacion,
        identificacion: t.identificacion,
        tipoPersona: t.tipoPersona,
        telefono: t.telefono,
        ciudad: t.ciudad,
        pais: "Colombia",
        observaciones: t.observaciones,
        diasCreditoProveedor: 0,
        cupoCredito: t.cupoCredito,
        diasCreditoCliente: t.diasCreditoCliente,
        requiereFacturaElectronica: false,
        activo: true,
      })
      .onConflictDoNothing({
        target: [schema.terceros.empresaId, schema.terceros.codigo],
      });
  }
  console.log(`  ✓ Terceros sembrados`);

  // ── 9. Verificación final ────────────────────────────────────────────────────
  console.log("\n─── Verificación ───────────────────────────────────────────");

  const [{ c: cBodegas }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx06 WHERE empresa_id = ${E}`,
  );
  const [{ c: cCategorias }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx08 WHERE empresa_id = ${E}`,
  );
  const [{ c: cProductos }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx10 WHERE empresa_id = ${E}`,
  );
  const [{ c: cProdUnidades }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx11 pu INNER JOIN vx10 p ON p.id = pu.producto_id WHERE p.empresa_id = ${E} AND pu.precio_venta IS NOT NULL`,
  );
  const [{ c: cInventario }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx16 WHERE empresa_id = ${E} AND cantidad_actual > 0`,
  );
  const [{ c: cClientes }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx07 WHERE empresa_id = ${E} AND tipo IN ('cliente','ambos')`,
  );
  const [{ c: cProveedores }] = await db.execute<{ c: number }>(
    `SELECT COUNT(*)::int c FROM vx07 WHERE empresa_id = ${E} AND tipo IN ('proveedor','ambos')`,
  );

  console.log(`  vx06 bodegas                     : ${cBodegas}`);
  console.log(`  vx08 categorias                  : ${cCategorias}`);
  console.log(`  vx10 productos                   : ${cProductos}`);
  console.log(`  vx11 productoUnidades c/precioVenta: ${cProdUnidades}`);
  console.log(`  vx16 inventario stock>0           : ${cInventario}`);
  console.log(`  vx07 clientes                    : ${cClientes}`);
  console.log(`  vx07 proveedores                 : ${cProveedores}`);
  console.log("────────────────────────────────────────────────────────────");
  console.log("\n✓ Seed demo completado.");
  console.log("  Login: admin@demo.co  /  Vertex2026!");

  await client.end();
}

main().catch(async (e) => {
  console.error("✗ Error en seed-demo:", e);
  await client.end();
  process.exit(1);
});
