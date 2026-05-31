import "server-only";
import { and, eq, desc, count, asc, gt, sql } from "drizzle-orm";
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
  cuentasPropias,
  facturas,
} from "@/lib/db/schema";
import { movimientoDesdePago, type BeneficiarioSnapshot } from "@/lib/domain/tesoreria";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { aplicarAbono } from "@/lib/domain/cartera";
import { calcularRetenciones } from "@/lib/domain/retenciones";
import { retencionesActivas } from "./retenciones";
import { distribuirFIFO } from "@/lib/domain/cobro";
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
    .select({
      pago: pagosProveedor,
      proveedor: terceros.razonSocial,
      cuentaOrigen: cuentasPropias.nombre,
    })
    .from(pagosProveedor)
    .innerJoin(terceros, eq(pagosProveedor.proveedorId, terceros.id))
    .leftJoin(cuentasPropias, eq(pagosProveedor.cuentaOrigenId, cuentasPropias.id))
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

/** Deudores agrupados por cliente (solo con saldo > 0), más antiguo primero. */
export async function deudoresPorCliente(empresaId: number) {
  const rows = await db
    .select({
      clienteId: cuentasPorCobrar.clienteId,
      cliente: terceros.razonSocial,
      total: sql<string>`sum(${cuentasPorCobrar.saldoPendiente})`,
      venceMin: sql<string>`min(${cuentasPorCobrar.fechaVencimiento})`,
      docs: count(),
    })
    .from(cuentasPorCobrar)
    .innerJoin(terceros, eq(cuentasPorCobrar.clienteId, terceros.id))
    .where(and(eq(cuentasPorCobrar.empresaId, empresaId), gt(cuentasPorCobrar.saldoPendiente, "0")))
    .groupBy(cuentasPorCobrar.clienteId, terceros.razonSocial)
    .orderBy(asc(sql`min(${cuentasPorCobrar.fechaVencimiento})`));
  return rows.map((r) => ({
    clienteId: r.clienteId,
    cliente: r.cliente,
    total: Number(r.total),
    venceMin: r.venceMin,
    docs: Number(r.docs),
  }));
}

/** Registra cuánto pagó un cliente y lo reparte FIFO entre sus deudas abiertas. */
export async function cobrarACliente(
  clienteId: number,
  datos: { monto: number; metodoPago: string; fecha: string; cuentaDestinoId?: number; referencia?: string },
  ctx: Contexto,
): Promise<number> {
  if (datos.monto <= 0) throw new AbonoInvalido("El valor debe ser mayor a 0.");
  const abiertas = await db
    .select({ id: cuentasPorCobrar.id, saldo: cuentasPorCobrar.saldoPendiente })
    .from(cuentasPorCobrar)
    .where(and(eq(cuentasPorCobrar.empresaId, ctx.empresaId), eq(cuentasPorCobrar.clienteId, clienteId), gt(cuentasPorCobrar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorCobrar.fechaVencimiento), asc(cuentasPorCobrar.id));
  const aplic = distribuirFIFO(abiertas.map((a) => ({ id: a.id, saldo: Number(a.saldo) })), datos.monto);
  if (aplic.length === 0) throw new AbonoInvalido("Este cliente no tiene deudas pendientes.");
  let aplicado = 0;
  for (const a of aplic) {
    await registrarRecaudo(
      a.id,
      { valor: a.abono, metodoPago: datos.metodoPago, fecha: datos.fecha, cuentaDestinoId: datos.cuentaDestinoId, referencia: datos.referencia },
      ctx,
    );
    aplicado += a.abono;
  }
  return aplicado;
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

// ── Acreedores / Pago a proveedor FIFO (vx26 / vx27) ────────────────────────

/** Proveedores con saldo por pagar, agrupados; más antiguo primero. */
export async function acreedoresPorProveedor(empresaId: number) {
  const rows = await db
    .select({
      proveedorId: cuentasPorPagar.proveedorId,
      proveedor: terceros.razonSocial,
      facturaElectronica: terceros.requiereFacturaElectronica,
      total: sql<string>`sum(${cuentasPorPagar.saldoPendiente})`,
      venceMin: sql<string>`min(${cuentasPorPagar.fechaVencimiento})`,
      docs: count(),
    })
    .from(cuentasPorPagar)
    .innerJoin(terceros, eq(cuentasPorPagar.proveedorId, terceros.id))
    .where(and(eq(cuentasPorPagar.empresaId, empresaId), gt(cuentasPorPagar.saldoPendiente, "0")))
    .groupBy(cuentasPorPagar.proveedorId, terceros.razonSocial, terceros.requiereFacturaElectronica)
    .orderBy(asc(sql`min(${cuentasPorPagar.fechaVencimiento})`));
  return rows.map((r) => ({
    proveedorId: r.proveedorId,
    proveedor: r.proveedor,
    facturaElectronica: r.facturaElectronica,
    total: Number(r.total),
    venceMin: r.venceMin,
    docs: Number(r.docs),
  }));
}

/** Paga a un proveedor un monto total: reparte FIFO a sus CxP, retención (solo FE) sobre el total, una salida de tesorería por el neto. */
export async function pagarAProveedor(
  proveedorId: number,
  datos: { monto: number; metodoPago: string; fecha: string; cuentaOrigenId?: number; beneficiario?: BeneficiarioSnapshot | null; referencia?: string },
  ctx: Contexto,
): Promise<number> {
  if (datos.monto <= 0) throw new AbonoInvalido("El valor debe ser mayor a 0.");

  const [prov] = await db
    .select({ fe: terceros.requiereFacturaElectronica })
    .from(terceros)
    .where(eq(terceros.id, proveedorId))
    .limit(1);
  const config = await retencionesActivas(ctx.empresaId);
  const ret = calcularRetenciones(datos.monto, config, prov?.fe ?? false);

  const abiertas = await db
    .select({ id: cuentasPorPagar.id, saldo: cuentasPorPagar.saldoPendiente })
    .from(cuentasPorPagar)
    .where(and(eq(cuentasPorPagar.empresaId, ctx.empresaId), eq(cuentasPorPagar.proveedorId, proveedorId), gt(cuentasPorPagar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorPagar.fechaVencimiento), asc(cuentasPorPagar.id));
  const aplic = distribuirFIFO(abiertas.map((a) => ({ id: a.id, saldo: Number(a.saldo) })), datos.monto);
  if (aplic.length === 0) throw new AbonoInvalido("Este proveedor no tiene deudas pendientes.");

  const [{ c }] = await db.select({ c: count() }).from(pagosProveedor).where(eq(pagosProveedor.empresaId, ctx.empresaId));

  let aplicado = 0;
  await db.transaction(async (tx) => {
    for (let i = 0; i < aplic.length; i++) {
      const a = aplic[i];
      const numero = formatearNumero("PAG", Number(c) + 1 + i);
      const esPrimero = i === 0;
      const [pago] = await tx
        .insert(pagosProveedor)
        .values({
          empresaId: ctx.empresaId,
          proveedorId,
          cuentaPorPagarId: a.id,
          numero,
          fecha: datos.fecha,
          valor: String(a.abono),
          retencionTotal: esPrimero ? String(ret.total) : "0",
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

      if (esPrimero && ret.detalle.length) {
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

      const [cxp] = await tx.select().from(cuentasPorPagar).where(eq(cuentasPorPagar.id, a.id)).limit(1);
      const nuevo = aplicarAbono(Number(cxp.saldoPendiente), a.abono);
      await tx.update(cuentasPorPagar).set({ saldoPendiente: String(nuevo.nuevoSaldo), updatedAt: new Date() }).where(eq(cuentasPorPagar.id, a.id));
      aplicado += a.abono;
    }

    if (datos.cuentaOrigenId) {
      const mov = movimientoDesdePago({ valor: datos.monto, retencionTotal: ret.total });
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: datos.cuentaOrigenId,
        fecha: datos.fecha,
        tipo: mov.tipo,
        origen: "pago_proveedor",
        valor: String(mov.valor),
        descripcion: "Pago a proveedor",
        usuarioId: ctx.usuarioId,
      });
    }

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx27", modelId: proveedorId, accion: "CREAR", registroNuevo: { proveedorId, monto: datos.monto, retencion: ret.total }, ipOrigen: ctx.ip },
      tx,
    );
  });
  return aplicado;
}

export interface DocAbierto {
  id: number;
  numero: string;
  fecha: string;
  vence: string;
  total: number;
  saldo: number;
}

/** Facturas con saldo pendiente de UN cliente (las que componen su deuda). */
export async function cuentasPorCobrarDe(empresaId: number, clienteId: number): Promise<DocAbierto[]> {
  const rows = await db
    .select({
      id: cuentasPorCobrar.id,
      numero: facturas.numero,
      fecha: cuentasPorCobrar.fechaFactura,
      vence: cuentasPorCobrar.fechaVencimiento,
      total: cuentasPorCobrar.valorTotal,
      saldo: cuentasPorCobrar.saldoPendiente,
    })
    .from(cuentasPorCobrar)
    .innerJoin(facturas, eq(cuentasPorCobrar.facturaId, facturas.id))
    .where(and(eq(cuentasPorCobrar.empresaId, empresaId), eq(cuentasPorCobrar.clienteId, clienteId), gt(cuentasPorCobrar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorCobrar.fechaVencimiento));
  return rows.map((r) => ({ ...r, total: Number(r.total), saldo: Number(r.saldo) }));
}

/** Documentos con saldo pendiente de UN proveedor (lo que le debes). */
export async function cuentasPorPagarDe(empresaId: number, proveedorId: number): Promise<DocAbierto[]> {
  const rows = await db
    .select({
      id: cuentasPorPagar.id,
      numero: cuentasPorPagar.numeroFactura,
      fecha: cuentasPorPagar.fechaFactura,
      vence: cuentasPorPagar.fechaVencimiento,
      total: cuentasPorPagar.valorTotal,
      saldo: cuentasPorPagar.saldoPendiente,
    })
    .from(cuentasPorPagar)
    .where(and(eq(cuentasPorPagar.empresaId, empresaId), eq(cuentasPorPagar.proveedorId, proveedorId), gt(cuentasPorPagar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorPagar.fechaVencimiento));
  return rows.map((r) => ({ ...r, total: Number(r.total), saldo: Number(r.saldo) }));
}

/** Cuenta por cobrar de UNA factura (para cobrar esa factura puntual). */
export async function cuentaPorCobrarDeFactura(
  empresaId: number,
  facturaId: number,
): Promise<{ id: number; total: number; saldo: number } | null> {
  const [r] = await db
    .select({ id: cuentasPorCobrar.id, total: cuentasPorCobrar.valorTotal, saldo: cuentasPorCobrar.saldoPendiente })
    .from(cuentasPorCobrar)
    .where(and(eq(cuentasPorCobrar.empresaId, empresaId), eq(cuentasPorCobrar.facturaId, facturaId)))
    .limit(1);
  return r ? { id: r.id, total: Number(r.total), saldo: Number(r.saldo) } : null;
}

/** Cuenta por pagar generada por UN pedido (lo que quedó debiendo al recibirlo). */
export async function cuentaPorPagarDePedido(
  empresaId: number,
  pedidoId: number,
): Promise<{ total: number; saldo: number; vence: string } | null> {
  const [r] = await db
    .select({ total: cuentasPorPagar.valorTotal, saldo: cuentasPorPagar.saldoPendiente, vence: cuentasPorPagar.fechaVencimiento })
    .from(cuentasPorPagar)
    .where(and(eq(cuentasPorPagar.empresaId, empresaId), eq(cuentasPorPagar.pedidoId, pedidoId)))
    .limit(1);
  return r ? { total: Number(r.total), saldo: Number(r.saldo), vence: r.vence } : null;
}

/** Todos los documentos abiertos por pagar, agrupados por proveedor (sin N+1). */
export async function cuentasPorPagarAbiertasPorProveedor(empresaId: number): Promise<Record<number, DocAbierto[]>> {
  const rows = await db
    .select({
      proveedorId: cuentasPorPagar.proveedorId,
      id: cuentasPorPagar.id,
      numero: cuentasPorPagar.numeroFactura,
      fecha: cuentasPorPagar.fechaFactura,
      vence: cuentasPorPagar.fechaVencimiento,
      total: cuentasPorPagar.valorTotal,
      saldo: cuentasPorPagar.saldoPendiente,
    })
    .from(cuentasPorPagar)
    .where(and(eq(cuentasPorPagar.empresaId, empresaId), gt(cuentasPorPagar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorPagar.fechaVencimiento));
  const porProveedor: Record<number, DocAbierto[]> = {};
  for (const r of rows) {
    (porProveedor[r.proveedorId] ??= []).push({ id: r.id, numero: r.numero, fecha: r.fecha, vence: r.vence, total: Number(r.total), saldo: Number(r.saldo) });
  }
  return porProveedor;
}

/** Todos los documentos abiertos por cobrar, agrupados por cliente (sin N+1). */
export async function cuentasPorCobrarAbiertasPorCliente(empresaId: number): Promise<Record<number, DocAbierto[]>> {
  const rows = await db
    .select({
      clienteId: cuentasPorCobrar.clienteId,
      id: cuentasPorCobrar.id,
      numero: facturas.numero,
      fecha: cuentasPorCobrar.fechaFactura,
      vence: cuentasPorCobrar.fechaVencimiento,
      total: cuentasPorCobrar.valorTotal,
      saldo: cuentasPorCobrar.saldoPendiente,
    })
    .from(cuentasPorCobrar)
    .innerJoin(facturas, eq(cuentasPorCobrar.facturaId, facturas.id))
    .where(and(eq(cuentasPorCobrar.empresaId, empresaId), gt(cuentasPorCobrar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorCobrar.fechaVencimiento));
  const porCliente: Record<number, DocAbierto[]> = {};
  for (const r of rows) {
    (porCliente[r.clienteId] ??= []).push({ id: r.id, numero: r.numero, fecha: r.fecha, vence: r.vence, total: Number(r.total), saldo: Number(r.saldo) });
  }
  return porCliente;
}
