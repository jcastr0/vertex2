import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerUsuario, listarRolesAsignables } from "@/lib/services/usuarios";
import { PageHeader } from "@/components/page-header";
import { UsuarioForm } from "../../usuario-form";

export const metadata: Metadata = { title: "Editar usuario — Vertex" };

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("usuarios.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const u = await obtenerUsuario(empresaId, parseId(id));
  if (!u) notFound();
  const roles = await listarRolesAsignables();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Editar usuario" description={u.email} />
      <UsuarioForm usuario={{ id: u.id, nombre: u.nombre, email: u.email, activo: u.activo, esRecaudador: u.esRecaudador, rolId: u.rolId }} roles={roles.map((r) => ({ id: r.id, nombre: r.nombre }))} />
    </div>
  );
}
