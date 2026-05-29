import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/guard";
import { puede, type Permiso } from "@/lib/auth/roles";
import { MANUALES } from "@/lib/manuales";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Manuales — Vertex" };

export default async function ManualesPage() {
  const sesion = await requirePermiso("manuales.ver");
  const visibles = MANUALES.filter((m) => puede(sesion.rol, `${m.modulo}.ver` as Permiso));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Manuales" description="Guías rápidas para usar Vertex." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.slug} href={`/manuales/${m.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
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
