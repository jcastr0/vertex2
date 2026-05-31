import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requirePermiso } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede, type Permiso } from "@/lib/auth/roles";
import { getManual } from "@/lib/manuales";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Manual — Vertex" };

export default async function ManualPage({ params }: { params: Promise<{ slug: string }> }) {
  const sesion = await requirePermiso("manuales.ver");
  const permisos = await getPermisos();
  const { slug } = await params;
  const manual = getManual(slug);
  if (!manual) notFound();
  if (!puede(permisos, `${manual.modulo}.ver` as Permiso)) redirect("/manuales");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/manuales" className={buttonVariants({ variant: "ghost", size: "sm" }) + " mb-4"}>
        <ArrowLeft className="size-4" /> Manuales
      </Link>
      <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{manual.contenido}</ReactMarkdown>
      </article>
    </div>
  );
}
