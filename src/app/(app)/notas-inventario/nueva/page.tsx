import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarBodegas } from "@/lib/services/bodegas";
import { listarProductos } from "@/lib/services/productos";
import { listarTerceros } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { NotaForm } from "../nota-form";

export const metadata: Metadata = { title: "Nueva nota de inventario — Vertex" };

export default async function NuevaNotaPage() {
  await requirePermiso("notas_inventario.crear");
  const { empresaId } = await requireEmpresa();
  const [bodegas, productos, terceros] = await Promise.all([
    listarBodegas(empresaId),
    listarProductos(empresaId),
    listarTerceros(empresaId),
  ]);

  const proveedores = terceros
    .filter((t) => t.activo && (t.tipo === "proveedor" || t.tipo === "ambos"))
    .map((t) => ({ id: t.id, nombre: t.razonSocial }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nueva nota de inventario" description="Registra un ajuste de existencias." />
      <NotaForm
        bodegas={bodegas.filter((b) => b.activo).map((b) => ({ id: b.id, nombre: b.nombre }))}
        productos={productos.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku }))}
        proveedores={proveedores}
      />
    </div>
  );
}
