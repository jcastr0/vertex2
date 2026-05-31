import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { MatrizPermisos } from "../matriz-permisos";

export const metadata: Metadata = { title: "Nuevo rol — Vertex" };

export default async function NuevoRolPage() {
  await requirePermiso("roles.crear");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Nuevo rol" description="Ponle nombre y marca sus permisos." />
      <MatrizPermisos permisosIniciales={[]} modoCrear />
    </div>
  );
}
