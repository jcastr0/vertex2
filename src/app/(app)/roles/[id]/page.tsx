import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso } from "@/lib/auth/guard";
import { obtenerRol } from "@/lib/services/roles";
import { PageHeader } from "@/components/page-header";
import { MatrizPermisos } from "../matriz-permisos";

export const metadata: Metadata = { title: "Rol — Vertex" };

export default async function RolPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("roles.editar");
  const { id } = await params;
  const rol = await obtenerRol(parseId(id));
  if (!rol) notFound();
  const esSuper = rol.nombre === "SuperAdmin";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={rol.nombre}
        description={esSuper ? "Acceso total — no editable." : "Marca lo que puede hacer este rol."}
      />
      {esSuper ? (
        <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          El rol SuperAdmin tiene acceso total a todo el sistema y no se edita.
        </p>
      ) : (
        <MatrizPermisos rolId={rol.id} permisosIniciales={rol.permisos ?? []} />
      )}
    </div>
  );
}
