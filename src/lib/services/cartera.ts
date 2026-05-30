import "server-only";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cuentasPorPagar,
  pagosProveedor,
  pagoRetenciones,
  cuentasPorCobrar,
  recaudosClientes,
  terceros,
  movimientosTesoreria,
  cuentasBeneficiario,
} from "@/lib/db/schema";
import { movimientoDesdePago, type BeneficiarioSnapshot } from "@/lib/domain/tesoreria";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { aplicarAbono } from "@/lib/domain/cartera";
import { calcularRetenciones } from "@/lib/domain/retenciones";
import { retencionesActivas } from "./retenciones";
import type { Contexto } from "./bodegas";

export class AbonoInvalido extends Error {}

export interface DatosAbono {
  valor: number;
  metodoPago: string;
  referencia?: string;
  fecha: string;
  cuentaOrigenId?: number;       // pagos
  cuentaDestinoId?: number;      // recaudos
  beneficiario?: BeneficiarioSnapshot | null; // resuelto en la action
  guardarBeneficiario?: boolean;  // si el ad-hoc se guarda en catálogo
}

// ── Cuentas por pagar (vx26) / Pagos a proveedor (vx27) ──────────────────────
export async function listarCuentasPorPagar(empresaId: number) {
  return db
    .select({
      cuenta: cuentasPorPagar,
      proveedor: terceros.razonSocial,
      facturaElectronica: terceros.requiereFacturaElectronica,
    })
    .from(cuentasPorPagar)
    .innerJoin(terceros, eq(cuentasPorPagar.proveedorId, terceros.id))
    .where(eq(cuentasPorPagar.empresaId, empresaId))
    .orderBy(cuentasPorPagar.fechaVencimiento);
}

export async function listarPagos(empresaId: number) {
  return db
    .select({ pago: pagosProveedor, proveedor: terceros.razonSocial })
    .from(pagosProveedor)
    .innerJoin(terceros, eq(pagosProveedor.proveedorId, terceros.id))
    .where(eq(pagosProveedor.empresaId, empresaId))
    .orderBy(desc(pagosProveedor.createdAt));
}

export async function registrarPago(
  cuentaPorPagarId: number,
  datos: DatosAbono,
  ctx: Contexto,
): Promise<void> {
  if (datos.valor <= 0) throw new AbonoInvalido("El valor debe ser mayor a 0.");
  const [{ c }] = await db
    .select({ c: count() })
    .from(pagosProveedor)
    .where(eq(pagosProveedor.empresaId, ctx.empresaId));
  const numero = formatearNumero("PAG", Number(c) + 1);

  // Retenciones: solo aplican a proveedores con factura electrónica.
  const [prov] = await db
    .select({ fe: terceros.requiereFacturaElectronica })
    .from(cuentasPorPagar)
    .innerJoin(terceros, eq(cuentasPorPagar.proveedorId, terceros.id))
    .where(and(eq(cuentasPorPagar.empresaId, ctx.empresaId), eq(cuentasPorPagar.id, cuentaPorPagarId)))
    .limit(1);
  const config = await retencionesActivas(ctx.empresaId);
  const ret = calcularRetenciones(datos.valor, config, prov?.fe ?? false);

  await db.transaction(async (tx) => {
    const [cxp] = await tx
      .select()
      .from(cuentasPorPagar)
      .where(and(eq(cuentasPorPagar.empresaId, ctx.empresaId), eq(cuentasPorPagar.id, cuentaPorPagarId)))
      .limit(1);
    if (!cxp) throw new AbonoInvalido("Cuenta por pagar no encontrada.");
    const saldo = Number(cxp.saldoPendiente);
    if (datos.valor > saldo) {
      throw new AbonoInvalido(`El pago ($${datos.valor}) excede el saldo pendiente ($${saldo}).`);
    }
    const r = aplicarAbono(saldo, datos.valor);

    const [pago] = await tx
      .insert(pagosProveedor)
      .values({
        empresaId: ctx.empresaId,
        proveedorId: cxp.proveedorId,
        cuentaPorPagarId: cxp.id,
        numero,
        fecha: datos.fecha,
        valor: String(datos.valor),
        retencionTotal: String(ret.total),
        cuentaOrigenId: datos.cuentaOrigenId ?? null,
        beneficiarioCuentaId: datos.beneficiario?.beneficiarioCuentaId ?? null,
        beneficiarioBanco: datos.beneficiario?.banco ?? null,
        beneficiarioCuenta: datos.beneficiario?.numeroCuenta ?? null,
        beneficiarioNit: datos.beneficiario?.nit ?? null,
        beneficiarioNombre: datos.beneficiario?.nombre ?? null,
        metodoPago: datos.metodoPago,
        referencia: datos.referencia || null,
        estado: "activo",
        usuarioId: ctx.usuarioId,
      })
      .returning();

    if (ret.detalle.length) {
      await tx.insert(pagoRetenciones).values(
        ret.detalle.map((d) => ({
          empresaId: ctx.empresaId,
          pagoId: pago.id,
          retencionId: d.retencionId,
          base: String(d.base),
          porcentaje: String(d.porcentaje),
          valor: String(d.valor),
        })),
      );
    }

    if (datos.cuentaOrigenId) {
      const movPago = movimientoDesdePago({ valor: datos.valor, retencionTotal: ret.total });
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: datos.cuentaOrigenId,
        fecha: datos.fecha,
        tipo: movPago.tipo,
        origen: "pago_proveedor",
        valor: String(movPago.valor),
        descripcion: `Pago ${numero} a ${datos.beneficiario?.nombre ?? "proveedor"}`,
        pagoId: pago.id,
        usuarioId: ctx.usuarioId,
      });
    }

    if (datos.guardarBeneficiario && datos.beneficiario && datos.beneficiario.beneficiarioCuentaId === null) {
      await tx.insert(cuentasBeneficiario).values({
        empresaId: ctx.empresaId,
        terceroId: cxp.proveedorId,
        banco: datos.beneficiario.banco,
        tipo: "ahorros",
        numeroCuenta: datos.beneficiario.numeroCuenta,
        titularNit: datos.beneficiario.nit,
        titularNombre: datos.beneficiario.nombre,
        activa: true,
      });
    }

    await tx
      .update(cuentasPorPagar)
      .set({ saldoPendiente: String(r.nuevoSaldo), updatedAt: new Date() })
      .where(eq(cuentasPorPagar.id, cxp.id));

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx27",
        modelId: pago.id,
        accion: "CREAR",
        registroNuevo: pago,
        ipOrigen: ctx.ip,
      },
      tx,
    );
  });
}

// ── Cuentas por cobrar (vx28) / Recaudos de cliente (vx29) ───────────────────
export async function listarCuentasPorCobrar(empresaId: number) {
  return db
    .select({ cuenta: cuentasPorCobrar, cliente: terceros.razonSocial })
    .from(cuentasPorCobrar)
    .innerJoin(terceros, eq(cuentasPorCobrar.clienteId, terceros.id))
    .where(eq(cuentasPorCobrar.empresaId, empresaId))
    .orderBy(cuentasPorCobrar.fechaVencimiento);
}

export async function listarRecaudos(empresaId: number) {
  return db
    .select({ recaudo: recaudosClientes, cliente: terceros.razonSocial })
    .from(recaudosClientes)
    .innerJoin(terceros, eq(recaudosClientes.clienteId, terceros.id))
    .where(eq(recaudosClientes.empresaId, empresaId))
    .orderBy(desc(recaudosClientes.createdAt));
}

export async function registrarRecaudo(
  cuentaPorCobrarId: number,
  datos: DatosAbono,
  ctx: Contexto,
): Promise<number> {
  if (datos.valor <= 0) throw new AbonoInvalido("El valor debe ser mayor a 0.");
  const [{ c }] = await db
    .select({ c: count() })
    .from(recaudosClientes)
    .where(eq(recaudosClientes.empresaId, ctx.empresaId));
  const numero = formatearNumero("REC", Number(c) + 1);

  return db.transaction(async (tx) => {
    const [cxc] = await tx
      .select()
      .from(cuentasPorCobrar)
      .where(and(eq(cuentasPorCobrar.empresaId, ctx.empresaId), eq(cuentasPorCobrar.id, cuentaPorCobrarId)))
      .limit(1);
    if (!cxc) throw new AbonoInvalido("Cuenta por cobrar no encontrada.");
    const saldo = Number(cxc.saldoPendiente);
    if (datos.valor > saldo) {
      throw new AbonoInvalido(`El recaudo ($${datos.valor}) excede el saldo pendiente ($${saldo}).`);
    }
    const r = aplicarAbono(saldo, datos.valor);

    const [recaudo] = await tx
      .insert(recaudosClientes)
      .values({
        empresaId: ctx.empresaId,
        clienteId: cxc.clienteId,
        cuentaPorCobrarId: cxc.id,
        numero,
        fecha: datos.fecha,
        valor: String(datos.valor),
        cuentaDestinoId: datos.cuentaDestinoId ?? null,
        metodoPago: datos.metodoPago,
        referencia: datos.referencia || null,
        estado: "activo",
        usuarioId: ctx.usuarioId,
      })
      .returning();

    if (datos.cuentaDestinoId) {
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: datos.cuentaDestinoId,
        fecha: datos.fecha,
        tipo: "entrada",
        origen: "recaudo_cliente",
        valor: String(datos.valor),
        descripcion: `Recaudo ${numero}`,
        recaudoId: recaudo.id,
        usuarioId: ctx.usuarioId,
      });
    }

    await tx
      .update(cuentasPorCobrar)
      .set({ saldoPendiente: String(r.nuevoSaldo), updatedAt: new Date() })
      .where(eq(cuentasPorCobrar.id, cxc.id));

    await registrarAuditoria(
      {
        empresaId: ctx.empresaId,
        usuarioId: ctx.usuarioId,
        tablaAfectada: "vx29",
        modelId: recaudo.id,
        accion: "CREAR",
        registroNuevo: recaudo,
        ipOrigen: ctx.ip,
      },
      tx,
    );
    return recaudo.id;
  });
}
