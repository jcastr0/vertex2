import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { listarBodegas } from "@/lib/services/bodegas";
import { listarProductosVenta } from "@/lib/services/productos";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { PageHeader } from "@/components/page-header";
import { FacturaForm } from "../factura-form";

export const metadata: Metadata = { title: "Vender — Vertex" };

export default async function NuevaFacturaPage() {
  await requirePermiso("facturas.crear");
  const { empresaId } = await requireEmpresa();
  const [terceros, bodegas, productos, cuentasDestino] = await Promise.all([
    listarTerceros(empresaId),
    listarBodegas(empresaId),
    listarProductosVenta(empresaId),
    cuentasPropiasActivas(empresaId),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  const bodegasActivas = bodegas.filter((b) => b.activo);
  // Bodega principal primero (preseleccionada).
  bodegasActivas.sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Vender" description="Registra una venta en pocos pasos." />
      <FacturaForm
        hoy={hoy}
        clientes={terceros
          .filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos"))
          .map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        bodegas={bodegasActivas.map((b) => ({ id: b.id, nombre: b.nombre }))}
        productos={productos}
        cuentasDestino={cuentasDestino.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
