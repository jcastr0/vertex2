import { config } from "dotenv";
config({ path: ".env.local" });
if (!process.env.DATABASE_URL && process.env.DATABASE_URL_SESSION) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_SESSION;
}

import { describe, it, expect, afterAll } from "vitest";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  empresas,
  usuarios,
  bodegas,
  terceros,
  inventario,
  productoUnidades,
  facturaDetalles,
  movimientosInventario,
  facturas,
  auditoria,
} from "@/lib/db/schema";
import { crearFactura, ultimoPrecioPorCliente } from "@/lib/services/facturas";
import { listarProductosVenta } from "@/lib/services/productos";

describe.skipIf(!process.env.DATABASE_URL)(
  "crearFactura – integración precio por cliente",
  () => {
    let facturaId: number | null = null;
    let empresaId: number;
    let usuarioId: number;
    let bodegaId: number;
    let clienteId: number;
    let productoId: number;
    let unidadBaseId: number;
    let cantidadBaseConsumed: number;
    let invId: number;

    const PRECIO_UNICO = 7777;

    afterAll(async () => {
      // Best-effort cleanup
      if (facturaId == null) return;
      try {
        await db
          .delete(auditoria)
          .where(
            and(
              eq(auditoria.tablaAfectada, "vx21"),
              eq(auditoria.modelId, facturaId),
            ),
          );
      } catch (_) {}
      try {
        await db
          .delete(movimientosInventario)
          .where(eq(movimientosInventario.facturaId, facturaId));
      } catch (_) {}
      try {
        await db
          .delete(facturaDetalles)
          .where(eq(facturaDetalles.facturaId, facturaId));
      } catch (_) {}
      try {
        await db.delete(facturas).where(eq(facturas.id, facturaId));
      } catch (_) {}
      // Restore consumed stock
      try {
        const [inv] = await db
          .select()
          .from(inventario)
          .where(eq(inventario.id, invId))
          .limit(1);
        if (inv) {
          const restored = Number(inv.cantidadActual) + cantidadBaseConsumed;
          await db
            .update(inventario)
            .set({
              cantidadActual: String(restored),
              valorTotal: String(restored * Number(inv.costoPromedio)),
              ultimaActualizacion: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(inventario.id, invId));
        }
      } catch (_) {}
    });

    it("vende al precio por cliente y actualiza ultimoPrecioVenta", async () => {
      // 1. Lookup Empresa Demo
      const [empresa] = await db
        .select({ id: empresas.id })
        .from(empresas)
        .where(eq(empresas.nombre, "Empresa Demo"))
        .limit(1);
      expect(empresa, "Empresa Demo debe existir en la base").toBeTruthy();
      empresaId = empresa.id;

      // 2. Admin user for this empresa
      const [adminUser] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.empresaId, empresaId),
            eq(usuarios.email, "admin@demo.co"),
          ),
        )
        .limit(1);
      expect(adminUser, "admin@demo.co debe existir").toBeTruthy();
      usuarioId = adminUser.id;

      // 3. A bodega of this empresa
      const [bodega] = await db
        .select({ id: bodegas.id })
        .from(bodegas)
        .where(
          and(
            eq(bodegas.empresaId, empresaId),
            eq(bodegas.activo, true),
          ),
        )
        .limit(1);
      expect(bodega, "Debe haber al menos una bodega activa").toBeTruthy();
      bodegaId = bodega.id;

      // 4. A cliente (tipo cliente or ambos)
      const clienteRows = await db
        .select({ id: terceros.id })
        .from(terceros)
        .where(
          and(
            eq(terceros.empresaId, empresaId),
            inArray(terceros.tipo, ["cliente", "ambos"]),
            eq(terceros.activo, true),
          ),
        )
        .limit(1);
      expect(clienteRows.length, "Debe haber al menos un cliente activo").toBeGreaterThan(0);
      clienteId = clienteRows[0].id;

      // 5. Find a product with stock > 1 in this bodega
      const invRows = await db
        .select({
          invId: inventario.id,
          productoId: inventario.productoId,
          cantidadActual: inventario.cantidadActual,
        })
        .from(inventario)
        .where(
          and(
            eq(inventario.empresaId, empresaId),
            eq(inventario.bodegaId, bodegaId),
            gt(inventario.cantidadActual, "1"),
          ),
        )
        .limit(5);
      expect(
        invRows.length,
        "Debe haber al menos un producto con stock > 1 en la bodega",
      ).toBeGreaterThan(0);

      // Pick first product that has a productoUnidades (unidadBase) row
      let chosenPuRow: { unidadId: number } | null = null;
      let chosenInvRow: (typeof invRows)[0] | null = null;
      for (const row of invRows) {
        const [pu] = await db
          .select({ unidadId: productoUnidades.unidadId })
          .from(productoUnidades)
          .where(eq(productoUnidades.productoId, row.productoId))
          .limit(1);
        if (pu) {
          chosenPuRow = pu;
          chosenInvRow = row;
          break;
        }
      }
      expect(chosenInvRow, "Se necesita un producto con unidadBase registrada en vx11").toBeTruthy();

      productoId = chosenInvRow!.productoId;
      unidadBaseId = chosenPuRow!.unidadId;
      cantidadBaseConsumed = 1;
      invId = chosenInvRow!.invId;

      // 6. Create the factura with a distinctive price
      const hoy = new Date().toISOString().slice(0, 10);
      const factura = await crearFactura(
        {
          clienteId,
          bodegaId,
          fecha: hoy,
          tipoVenta: "contado",
          lineas: [
            {
              productoId,
              unidadId: unidadBaseId,
              cantidad: 1,
              precioUnitario: PRECIO_UNICO,
            },
          ],
        },
        { empresaId, usuarioId },
      );
      facturaId = factura.id;
      expect(factura.id).toBeGreaterThan(0);

      // 7. Assert ultimoPrecioPorCliente returns the distinctive price
      const preciosPorCliente = await ultimoPrecioPorCliente(empresaId, clienteId);
      expect(
        preciosPorCliente[productoId],
        `ultimoPrecioPorCliente debe retornar ${PRECIO_UNICO} para el producto ${productoId}`,
      ).toBe(PRECIO_UNICO);

      // 8. Assert listarProductosVenta reflects ultimoPrecioVenta for the product
      const productosVenta = await listarProductosVenta(empresaId);
      const prodVenta = productosVenta.find((p) => p.id === productoId);
      expect(
        prodVenta,
        `El producto ${productoId} debe aparecer en listarProductosVenta`,
      ).toBeTruthy();
      expect(
        prodVenta!.precio,
        `listarProductosVenta.precio debe ser ${PRECIO_UNICO} (ultimoPrecioVenta actualizado)`,
      ).toBe(PRECIO_UNICO);
    });
  },
);
