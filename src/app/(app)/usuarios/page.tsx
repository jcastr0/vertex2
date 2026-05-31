import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarUsuarios, type FilaUsuario } from "@/lib/services/usuarios";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsuarioRowActions } from "./usuario-row-actions";
import { Plus, Users } from "lucide-react";

export const metadata: Metadata = { title: "Usuarios — Vertex" };
const PAGE_SIZE = 10;

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("usuarios.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarUsuarios(empresaId);
  const puedeCrear = puede(permisos, "usuarios.crear");
  const puedeEditar = puede(permisos, "usuarios.editar");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (u) => `${u.nombre} ${u.email} ${u.rol ?? ""}`,
  });

  const columnas: Columna<FilaUsuario>[] = [
    { header: "Nombre", primary: true, cell: (u) => u.nombre },
    { header: "Correo", cell: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { header: "Rol", cell: (u) => (u.rol ? <Badge variant="secondary" className="font-normal">{u.rol}</Badge> : "—") },
    {
      header: "Estado",
      cell: (u) => (
        <Badge variant={u.activo ? "default" : "outline"} className="font-normal">
          {u.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Usuarios" description="Personas con acceso a esta empresa.">
        {puedeCrear && (
          <Link href="/usuarios/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo usuario
          </Link>
        )}
      </PageHeader>
      <ListaFiltrable
        base="/usuarios"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(u) => u.id}
        rowClassName={(u) => (u.activo ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar por nombre, correo o rol…"
        hayDatos={todos.length > 0}
        vacio={{ icon: Users, titulo: "Sin usuarios", texto: "Crea usuarios y asígnales un rol." }}
        actions={puedeEditar ? (u) => (u.esSuperadmin ? null : <UsuarioRowActions id={u.id} activo={u.activo} />) : undefined}
      />
    </div>
  );
}
