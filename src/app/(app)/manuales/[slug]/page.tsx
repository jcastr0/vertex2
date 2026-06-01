import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requirePermiso } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede, type Permiso } from "@/lib/auth/roles";
import { MANUALES, getManual, manualesOrdenados } from "@/lib/manuales";
import { buttonVariants } from "@/components/ui/button";
import { ManualImage } from "@/components/manuales/manual-image";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Manual — Vertex" };

export default async function ManualPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePermiso("manuales.ver");
  const permisos = await getPermisos();
  const { slug } = await params;
  const manual = getManual(slug);
  if (!manual) notFound();
  if (!puede(permisos, `${manual.modulo}.ver` as Permiso)) redirect("/manuales");

  // Recorrido: manuales que el usuario puede ver, en orden de lectura.
  const visibles = MANUALES.filter((m) => puede(permisos, `${m.modulo}.ver` as Permiso)).map((m) => m.slug);
  const orden = manualesOrdenados(visibles);
  const idx = orden.findIndex((m) => m.slug === slug);
  const anterior = idx > 0 ? orden[idx - 1] : null;
  const siguiente = idx >= 0 && idx < orden.length - 1 ? orden[idx + 1] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href="/manuales" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Manuales
        </Link>
        {idx >= 0 && <span className="text-xs text-muted-foreground">Paso {idx + 1} de {orden.length}</span>}
      </div>

      <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ManualImage }}>{manual.contenido}</ReactMarkdown>
      </article>

      {(anterior || siguiente) && (
        <nav className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 print:hidden">
          {anterior ? (
            <Link
              href={`/manuales/${anterior.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <ArrowLeft className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Anterior</span>
                <span className="block truncate font-medium">{anterior.titulo}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {siguiente && (
            <Link
              href={`/manuales/${siguiente.slug}`}
              className="flex items-center justify-end gap-3 rounded-xl border border-border p-4 text-right transition-colors hover:border-primary/40 hover:bg-primary/5 sm:col-start-2"
            >
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Siguiente</span>
                <span className="block truncate font-medium text-primary">{siguiente.titulo}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-primary" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
