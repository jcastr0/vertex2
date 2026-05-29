import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { listarBodegas } from "@/lib/services/bodegas";
import { listarProductos } from "@/lib/services/productos";
import { listarFacturas } from "@/lib/services/facturas";
import { PageHeader } from "@/components/page-header";
import { DevolucionForm } from "../devolucion-form";

export const metadata: Metadata = { title: "Nueva devolución — Vertex" };

export default async function NuevaDevolucionPage() {
  await requirePermiso("devoluciones.crear");
  const { empresaId } = await requireEmpresa();
  const [terceros, bodegas, productos, facturas] = await Promise.all([
    listarTerceros(empresaId),
    listarBodegas(empresaId),
    listarProductos(empresaId),
    listarFacturas(empresaId),
  ]);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nueva devolución" description="Reingresa productos y genera la nota crédito." />
      <DevolucionForm
        hoy={hoy}
        clientes={terceros
          .filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos"))
          .map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        bodegas={bodegas.filter((b) => b.activo).map((b) => ({ id: b.id, nombre: b.nombre }))}
        productos={productos.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku }))}
        facturas={facturas.map((f) => ({ id: f.factura.id, numero: f.factura.numero, clienteId: f.factura.clienteId }))}
      />
    </div>
  );
}
