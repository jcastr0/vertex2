import "server-only";
import { and, eq, ne, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturas, terceros, pagosProveedor, pagoRetenciones, retenciones, cuentasPorPagar } from "@/lib/db/schema";
import { toCsv } from "@/lib/csv";

const docCompleto = (tipo: string | null, id: string | null, dv: string | null) =>
  `${id ?? ""}${dv ? "-" + dv : ""}${tipo ? " (" + tipo + ")" : ""}`;

/**
 * CSV de VENTAS marcadas como factura electrónica, para que el contador las
 * emita en el sistema de la DIAN.
 */
export async function ventasElectronicasCsv(empresaId: number, desde: string, hasta: string): Promise<string> {
  const rows = await db
    .select({
      numero: facturas.numero,
      fecha: facturas.fecha,
      tipoVenta: facturas.tipoVenta,
      cliente: terceros.razonSocial,
      tipoDoc: terceros.tipoIdentificacion,
      identificacion: terceros.identificacion,
      dv: terceros.digitoVerificacion,
      subtotal: facturas.subtotal,
      impuestos: facturas.impuestos,
      total: facturas.total,
    })
    .from(facturas)
    .innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .where(and(
      eq(facturas.empresaId, empresaId),
      eq(facturas.esElectronica, true),
      ne(facturas.estado, "cancelada"),
      gte(facturas.fecha, desde),
      lte(facturas.fecha, hasta),
    ))
    .orderBy(asc(facturas.fecha), asc(facturas.numero));

  return toCsv(
    ["Numero", "Fecha", "Venta", "Cliente", "Documento", "Subtotal", "Impuestos", "Total"],
    rows.map((r) => [
      r.numero,
      r.fecha,
      r.tipoVenta,
      r.cliente,
      docCompleto(r.tipoDoc, r.identificacion, r.dv),
      Number(r.subtotal),
      Number(r.impuestos),
      Number(r.total),
    ]),
  );
}

/**
 * CSV de COMPRAS a proveedores con factura electrónica y sus retenciones, para
 * que el contador aplique las retenciones legales. Una fila por retención; los
 * pagos sin retención aparecen una vez.
 */
export async function comprasElectronicasCsv(empresaId: number, desde: string, hasta: string): Promise<string> {
  const rows = await db
    .select({
      fecha: pagosProveedor.fecha,
      numero: pagosProveedor.numero,
      proveedor: terceros.razonSocial,
      tipoDoc: terceros.tipoIdentificacion,
      identificacion: terceros.identificacion,
      dv: terceros.digitoVerificacion,
      valor: pagosProveedor.valor,
      retencionTotal: pagosProveedor.retencionTotal,
      retNombre: retenciones.nombre,
      retPorc: pagoRetenciones.porcentaje,
      retBase: pagoRetenciones.base,
      retValor: pagoRetenciones.valor,
    })
    .from(pagosProveedor)
    .innerJoin(terceros, eq(pagosProveedor.proveedorId, terceros.id))
    .innerJoin(cuentasPorPagar, eq(pagosProveedor.cuentaPorPagarId, cuentasPorPagar.id))
    .leftJoin(pagoRetenciones, eq(pagoRetenciones.pagoId, pagosProveedor.id))
    .leftJoin(retenciones, eq(pagoRetenciones.retencionId, retenciones.id))
    .where(and(
      eq(pagosProveedor.empresaId, empresaId),
      eq(cuentasPorPagar.esElectronica, true),
      ne(pagosProveedor.estado, "anulado"),
      gte(pagosProveedor.fecha, desde),
      lte(pagosProveedor.fecha, hasta),
    ))
    .orderBy(asc(pagosProveedor.fecha), asc(pagosProveedor.numero));

  return toCsv(
    ["Fecha", "Pago", "Proveedor", "Documento", "Pagado", "Retencion", "Porcentaje", "Base", "ValorRetencion", "Neto"],
    rows.map((r) => [
      r.fecha,
      r.numero,
      r.proveedor,
      docCompleto(r.tipoDoc, r.identificacion, r.dv),
      Number(r.valor),
      r.retNombre ?? "",
      r.retPorc != null ? Number(r.retPorc) : "",
      r.retBase != null ? Number(r.retBase) : "",
      r.retValor != null ? Number(r.retValor) : "",
      Number(r.valor) - Number(r.retencionTotal),
    ]),
  );
}
