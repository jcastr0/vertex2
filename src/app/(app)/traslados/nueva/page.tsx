import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarBodegas } from "@/lib/services/bodegas";
import { listarProductos } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { TrasladoForm } from "../traslado-form";

export const metadata: Metadata = { title: "Nuevo traslado — Vertex" };

export default async function NuevoTrasladoPage() {
  await requirePermiso("traslados.crear");
  const { empresaId } = await requireEmpresa();
  const [bodegas, productos] = await Promise.all([
    listarBodegas(empresaId),
    listarProductos(empresaId),
  ]);
  const hoy = hoyColombia();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo traslado" description="Mueve productos entre dos bodegas." />
      <TrasladoForm
        hoy={hoy}
        bodegas={bodegas.filter((b) => b.activo).map((b) => ({ id: b.id, nombre: b.nombre }))}
        productos={productos.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku }))}
      />
    </div>
  );
}
