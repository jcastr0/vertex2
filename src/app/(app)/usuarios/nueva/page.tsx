import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarRolesAsignables } from "@/lib/services/usuarios";
import { PageHeader } from "@/components/page-header";
import { UsuarioForm } from "../usuario-form";

export const metadata: Metadata = { title: "Nuevo usuario — Vertex" };

export default async function NuevoUsuarioPage() {
  await requirePermiso("usuarios.crear");
  await requireEmpresa();
  const roles = await listarRolesAsignables();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nuevo usuario" description="Crea un usuario y asígnale un rol." />
      <UsuarioForm roles={roles.map((r) => ({ id: r.id, nombre: r.nombre }))} />
    </div>
  );
}
