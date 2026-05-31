import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPermisos } from "@/lib/auth/permisos";
import { puede, type Permiso } from "@/lib/auth/roles";
import { grupoPorSlug } from "@/lib/modules";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Vertex" };

export default async function GrupoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const grupo = grupoPorSlug(slug);
  if (!grupo) notFound();

  const permisos = await getPermisos();
  const items = grupo.items.filter((it) => it.listo && puede(permisos, `${it.modulo}.ver` as Permiso));
  if (items.length === 0) notFound();

  const GrupoIcon = grupo.icon;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GrupoIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{grupo.titulo}</h1>
          <p className="text-sm text-muted-foreground">Elige una opción del módulo.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              {/* halo sutil en hover */}
              <span className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Icon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <h2 className="font-medium tracking-tight">{item.label}</h2>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <ArrowRight className="absolute right-4 top-5 size-4 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
