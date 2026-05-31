import "server-only";
import { and, eq, ne, gt, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturas, pedidos, cuentasPorCobrar, cuentasPorPagar } from "@/lib/db/schema";

export interface ResumenCliente {
  debe: number;
  vencido: boolean;
  haComprado: number;
  mes: number;
  ultima: string | null;
  docsAbiertos: number;
}

/** Resumen de la relación con un CLIENTE: cuánto debe, cuánto ha comprado, etc. */
export async function resumenCliente(
  empresaId: number,
  clienteId: number,
  hoy: string,
  desdeMes: string,
): Promise<ResumenCliente> {
  const [ventas] = await db
    .select({
      haComprado: sql<string>`coalesce(sum(${facturas.total}), 0)`,
      mes: sql<string>`coalesce(sum(case when ${facturas.fecha} >= ${desdeMes} then ${facturas.total} else 0 end), 0)`,
      ultima: sql<string | null>`max(${facturas.fecha})`,
    })
    .from(facturas)
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId), ne(facturas.estado, "cancelada")));

  const [deuda] = await db
    .select({
      debe: sql<string>`coalesce(sum(${cuentasPorCobrar.saldoPendiente}), 0)`,
      venceMin: sql<string | null>`min(${cuentasPorCobrar.fechaVencimiento})`,
      docs: count(),
    })
    .from(cuentasPorCobrar)
    .where(and(eq(cuentasPorCobrar.empresaId, empresaId), eq(cuentasPorCobrar.clienteId, clienteId), gt(cuentasPorCobrar.saldoPendiente, "0")));

  return {
    debe: Number(deuda?.debe ?? 0),
    vencido: !!deuda?.venceMin && deuda.venceMin < hoy,
    haComprado: Number(ventas?.haComprado ?? 0),
    mes: Number(ventas?.mes ?? 0),
    ultima: ventas?.ultima ?? null,
    docsAbiertos: Number(deuda?.docs ?? 0),
  };
}

export interface ResumenProveedor {
  leDebes: number;
  vencido: boolean;
  leHasComprado: number;
  mes: number;
  ultima: string | null;
  docsAbiertos: number;
}

/** Resumen de la relación con un PROVEEDOR: cuánto le debes, cuánto le has comprado. */
export async function resumenProveedor(
  empresaId: number,
  proveedorId: number,
  hoy: string,
  desdeMes: string,
): Promise<ResumenProveedor> {
  // Compras = pedidos recibidos o parcialmente recibidos.
  const recibidos = sql`${pedidos.estado} in ('recibido', 'parcial')`;
  const [compras] = await db
    .select({
      leHasComprado: sql<string>`coalesce(sum(case when ${recibidos} then ${pedidos.total} else 0 end), 0)`,
      mes: sql<string>`coalesce(sum(case when ${recibidos} and ${pedidos.fecha} >= ${desdeMes} then ${pedidos.total} else 0 end), 0)`,
      ultima: sql<string | null>`max(case when ${recibidos} then ${pedidos.fecha} else null end)`,
    })
    .from(pedidos)
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidos.proveedorId, proveedorId)));

  const [deuda] = await db
    .select({
      leDebes: sql<string>`coalesce(sum(${cuentasPorPagar.saldoPendiente}), 0)`,
      venceMin: sql<string | null>`min(${cuentasPorPagar.fechaVencimiento})`,
      docs: count(),
    })
    .from(cuentasPorPagar)
    .where(and(eq(cuentasPorPagar.empresaId, empresaId), eq(cuentasPorPagar.proveedorId, proveedorId), gt(cuentasPorPagar.saldoPendiente, "0")));

  return {
    leDebes: Number(deuda?.leDebes ?? 0),
    vencido: !!deuda?.venceMin && deuda.venceMin < hoy,
    leHasComprado: Number(compras?.leHasComprado ?? 0),
    mes: Number(compras?.mes ?? 0),
    ultima: compras?.ultima ?? null,
    docsAbiertos: Number(deuda?.docs ?? 0),
  };
}
