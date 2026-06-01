import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede, type Permiso } from "@/lib/auth/roles";
import { MANUALES, manualesOrdenados } from "@/lib/manuales";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Manuales — Vertex" };

export default async function ManualesPage() {
  await requirePermiso("manuales.ver");
  const permisos = await getPermisos();
  // En orden de lectura (flujo del negocio), solo los que el usuario puede ver.
  const visibles = manualesOrdenados(
    MANUALES.filter((m) => puede(permisos, `${m.modulo}.ver` as Permiso)).map((m) => m.slug),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Manuales" description="Una guía que puedes seguir paso a paso, en orden." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((m, i) => {
          const Icon = m.icon;
          return (
            <Link key={m.slug} href={`/manuales/${m.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="relative flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                    <span className="absolute -left-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <CardTitle className="text-base">{m.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.descripcion}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
