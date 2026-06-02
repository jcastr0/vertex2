import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { listarProductosVenta } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { CotizacionForm } from "../cotizacion-form";

export const metadata: Metadata = { title: "Nueva cotización — Vertex" };

export default async function NuevaCotizacionPage() {
  await requirePermiso("cotizaciones.crear");
  const { empresaId } = await requireEmpresa();
  const [terceros, productos] = await Promise.all([
    listarTerceros(empresaId),
    listarProductosVenta(empresaId),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nueva cotización" description="Arma lo que pidió el cliente; la facturas cuando la apruebe." />
      <CotizacionForm
        hoy={hoyColombia()}
        clientes={terceros.filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos")).map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        productos={productos.map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio }))}
      />
    </div>
  );
}
