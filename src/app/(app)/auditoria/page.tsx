import type { Metadata } from "next";
import { fechaHora } from "@/lib/fecha";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarAuditoria } from "@/lib/services/auditoria";
import { filtrarPaginar, parsePage, hrefPaginaFactory } from "@/lib/domain/listado";
import { VERBO, entidadDeTabla, etiquetaRegistro, describirCambios, type Accion } from "@/lib/domain/auditoria";
import { PageHeader } from "@/components/page-header";
import { FiltroBar } from "@/components/ui/filtro-bar";
import { Pagination } from "@/components/ui/pagination";
import { Plus, PencilLine, Trash2, ArrowRight, ShieldCheck, MapPin, type LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Auditoría — Vertex" };
const PAGE_SIZE = 12;

const VISUAL: Record<string, { icon: LucideIcon; color: string; ring: string }> = {
  CREAR: { icon: Plus, color: "text-primary", ring: "bg-primary/10" },
  ACTUALIZAR: { icon: PencilLine, color: "text-amber-600", ring: "bg-amber-500/10" },
  ELIMINAR: { icon: Trash2, color: "text-destructive", ring: "bg-destructive/10" },
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("auditoria.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarAuditoria(empresaId);

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (a) => {
      const ent = entidadDeTabla(a.tabla);
      return `${a.usuario ?? ""} ${VERBO[a.accion] ?? a.accion} ${ent.sing} ${etiquetaRegistro(a.nuevo, a.anterior) ?? ""} ${a.modulo ?? ""}`;
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Auditoría" description="La bitácora del negocio: quién hizo qué, cuándo y desde dónde." />

      <div className="mb-5">
        <FiltroBar placeholder="Buscar por persona, acción, documento o módulo…" />
      </div>

      {todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ShieldCheck className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Sin registros</p>
          <p className="text-sm text-muted-foreground">Las operaciones aparecerán aquí a medida que uses el sistema.</p>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Sin resultados{q ? ` para “${q}”` : ""}.
        </p>
      ) : (
        <ol className="space-y-0">
          {items.map((a, i) => {
            const v = VISUAL[a.accion] ?? VISUAL.ACTUALIZAR;
            const Icon = v.icon;
            const ent = entidadDeTabla(a.tabla);
            const verbo = VERBO[a.accion] ?? a.accion.toLowerCase();
            const ident = etiquetaRegistro(a.nuevo, a.anterior) ?? (a.modelId ? `#${a.modelId}` : null);
            const cambios = describirCambios(a.accion as Accion, a.anterior, a.nuevo);
            const ultimo = i === items.length - 1;
            return (
              <li key={a.id} className="relative flex gap-4 pb-6">
                {!ultimo && <span aria-hidden className="absolute left-[17px] top-10 -bottom-0 w-px bg-border" />}
                <span className={`relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${v.ring}`}>
                  <Icon className={`size-4 ${v.color}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">{a.usuario ?? "Alguien"}</span> {verbo} {ent.art}{" "}
                    {ident ? (
                      <>
                        {ent.sing} <span className="font-medium text-foreground">{ident}</span>
                      </>
                    ) : (
                      ent.sing
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="tabular">{fechaHora(a.fecha)}</span>
                    {a.modulo && (
                      <>
                        <span aria-hidden className="opacity-40">·</span>
                        <span>{a.modulo}</span>
                      </>
                    )}
                    {a.ip && (
                      <>
                        <span aria-hidden className="opacity-40">·</span>
                        <span className="inline-flex items-center gap-0.5 tabular">
                          <MapPin className="size-3 opacity-60" />
                          {a.ip}
                        </span>
                      </>
                    )}
                  </p>

                  {cambios.length > 0 && (
                    <dl className="mt-2 space-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                      {cambios.map((c) => (
                        <div key={c.label} className="flex flex-wrap items-baseline gap-x-1.5">
                          <dt className="text-muted-foreground">{c.label}:</dt>
                          {c.antes != null && (
                            <dd className={c.despues != null ? "text-muted-foreground line-through decoration-muted-foreground/40" : "font-medium"}>{c.antes}</dd>
                          )}
                          {c.antes != null && c.despues != null && <ArrowRight className="size-3 shrink-0 text-muted-foreground" />}
                          {c.despues != null && <dd className="font-medium">{c.despues}</dd>}
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination total={total} page={page} pageSize={PAGE_SIZE} hrefForPage={hrefPaginaFactory("/auditoria", q)} />
    </div>
  );
}
