"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseFacturaForm } from "@/lib/validation/factura";
import { crearFactura, ultimoPrecioPorCliente, ultimaUnidadVentaPorCliente, VentaInvalida } from "@/lib/services/facturas";

export interface FacturaState {
  error?: string;
}

export async function crearFacturaAction(
  _prev: FacturaState,
  form: FormData,
): Promise<FacturaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "facturas.crear")) return { error: "No tienes permiso para vender." };

  const parsed = parseFacturaForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  // Contado: cómo pagó y a qué cuenta entró el dinero.
  let metodoPago: string | undefined;
  let cuentaDestinoId: number | undefined;
  if (parsed.data.tipoVenta === "contado") {
    metodoPago = String(form.get("metodoPago") || "efectivo");
    cuentaDestinoId = Number(form.get("cuentaDestinoId")) || undefined;
    if (!cuentaDestinoId) return { error: "Elige a dónde entró el dinero." };
  }

  const esElectronica = String(form.get("esElectronica") || "") === "1";

  let nuevoId: number;
  try {
    const f = await crearFactura(
      {
        clienteId: parsed.data.clienteId,
        bodegaId: parsed.data.bodegaId,
        fecha: parsed.data.fecha,
        tipoVenta: parsed.data.tipoVenta,
        lineas: parsed.data.lineas,
        metodoPago,
        cuentaDestinoId,
        esElectronica,
      },
      c.ctx,
    );
    nuevoId = f.id;
  } catch (e) {
    if (e instanceof VentaInvalida) return { error: e.message };
    console.error("[facturas] error al crear:", e);
    return { error: "Ocurrió un error al registrar la venta." };
  }
  revalidatePath("/facturas");
  revalidatePath("/inventario");
  redirect(`/facturas/${nuevoId}`);
}

export async function preciosClienteAction(clienteId: number): Promise<Record<number, number>> {
  const c = await contexto();
  if (!c || !clienteId) return {};
  try {
    return await ultimoPrecioPorCliente(c.ctx.empresaId, clienteId);
  } catch (e) {
    // No bloquear la selección del cliente si fallara la consulta de precios.
    console.error("[facturas] error al cargar precios por cliente:", e);
    return {};
  }
}

/** Datos combinados del cliente: último precio y última unidad vendida por producto. */
export async function datosClienteAction(clienteId: number): Promise<{
  precios: Record<number, number>;
  unidades: Record<number, { unidadId: number; precio: number }>;
}> {
  const c = await contexto();
  if (!c || !clienteId) return { precios: {}, unidades: {} };
  try {
    const [precios, unidades] = await Promise.all([
      ultimoPrecioPorCliente(c.ctx.empresaId, clienteId),
      ultimaUnidadVentaPorCliente(c.ctx.empresaId, clienteId),
    ]);
    return { precios, unidades };
  } catch (e) {
    console.error("[facturas] error al cargar datos del cliente:", e);
    return { precios: {}, unidades: {} };
  }
}
