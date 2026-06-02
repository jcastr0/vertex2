import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hoyColombia } from "@/lib/fecha";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerCotizacion } from "@/lib/services/cotizaciones";
import { listarBodegas } from "@/lib/services/bodegas";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { listarProductos } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { FacturarCotizacionForm } from "../../facturar-cotizacion-form";

export const metadata: Metadata = { title: "Facturar cotización — Vertex" };

export default async function FacturarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("facturas.crear");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const cot = await obtenerCotizacion(empresaId, parseId(id));
  if (!cot) notFound();
  if (cot.estado !== "pendiente") redirect(`/cotizaciones/${cot.id}`);

  const [bodegas, cuentas, productos] = await Promise.all([
    listarBodegas(empresaId),
    cuentasPropiasActivas(empresaId),
    listarProductos(empresaId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Facturar ${cot.numero}`} description="Revisa y ajusta antes de crear la factura." />
      <FacturarCotizacionForm
        cotizacionId={cot.id}
        numero={cot.numero}
        hoy={hoyColombia()}
        bodegas={bodegas.filter((b) => b.activo).map((b) => ({ id: b.id, nombre: b.nombre }))}
        cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        lineasIniciales={cot.detalles.map((d) => ({ productoId: d.productoId, nombre: prodPorId.get(d.productoId) ?? `#${d.productoId}`, cantidad: Number(d.cantidad), precioUnitario: Number(d.precioUnitario) }))}
      />
    </div>
  );
}
