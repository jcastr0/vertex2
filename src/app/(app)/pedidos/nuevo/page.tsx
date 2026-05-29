import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { listarBodegas } from "@/lib/services/bodegas";
import { listarProductos, listarUnidadesMedida } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { PedidoForm } from "../pedido-form";

export const metadata: Metadata = { title: "Nuevo pedido — Vertex" };

export default async function NuevoPedidoPage() {
  await requirePermiso("pedidos.crear");
  const { empresaId } = await requireEmpresa();
  const [terceros, bodegas, productos, unidades] = await Promise.all([
    listarTerceros(empresaId),
    listarBodegas(empresaId),
    listarProductos(empresaId),
    listarUnidadesMedida(),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nuevo pedido" description="Compra a un proveedor; al recibir, ingresa a inventario." />
      <PedidoForm
        hoy={hoy}
        proveedores={terceros
          .filter((t) => t.activo && (t.tipo === "proveedor" || t.tipo === "ambos"))
          .map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        bodegas={bodegas.filter((b) => b.activo).map((b) => ({ id: b.id, nombre: b.nombre }))}
        productos={productos
          .filter((p) => p.activo)
          .map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku }))}
        unidades={unidades.map((u) => ({ id: u.id, nombre: u.nombre, abreviatura: u.abreviatura }))}
      />
    </div>
  );
}
