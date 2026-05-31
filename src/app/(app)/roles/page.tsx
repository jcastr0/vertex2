import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/guard";
import { listarRoles } from "@/lib/services/roles";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Plus, KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Roles — Vertex" };

export default async function RolesPage() {
  await requirePermiso("roles.ver");
  const roles = await listarRoles();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Roles y permisos" description="Define qué puede hacer cada rol.">
        <Link href="/roles/nuevo" className={buttonVariants()}>
          <Plus className="size-4" /> Nuevo rol
        </Link>
      </PageHeader>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {roles.map((r) => (
          <li key={r.id}>
            <Link
              href={`/roles/${r.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{r.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {r.permisos?.includes("*")
                    ? "Acceso total"
                    : `${r.permisos?.length ?? 0} permisos`}{" "}
                  · {r.usuarios} usuario(s)
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
