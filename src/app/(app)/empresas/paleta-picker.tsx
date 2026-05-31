"use client";
import { useState } from "react";
import { PALETAS, getPaleta } from "@/lib/temas/paletas";
import { contraste } from "@/lib/domain/tema";
import { cn } from "@/lib/utils";
import { Check, Triangle } from "lucide-react";

export function PaletaPicker({ defaultKey }: { defaultKey?: string | null }) {
  const [sel, setSel] = useState<string>(defaultKey ?? "");
  const paleta = getPaleta(sel);
  const familias = [...new Set(PALETAS.map((p) => p.familia))];

  // Colores efectivos del preview: paleta elegida o tokens de marca por defecto.
  const cSidebar = paleta?.sidebar ?? "var(--sidebar)";
  const cSidebarFg = paleta ? contraste(paleta.sidebar) : "var(--sidebar-foreground)";
  const cPrimario = paleta?.primario ?? "var(--primary)";
  const cPrimarioFg = paleta ? contraste(paleta.primario) : "#fff";
  const cAcento = paleta?.acento ?? "var(--accent)";
  const cAcentoFg = paleta ? contraste(paleta.acento) : "#111";

  return (
    <div className="space-y-6">
      <input type="hidden" name="paletaTema" value={sel} />

      {/* Preview en vivo — mini-mockup de Vertex */}
      <figure className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-black/[0.02]">
          {/* Barra superior simulando la ventana */}
          <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/40 px-3 py-2">
            <span className="size-2 rounded-full bg-foreground/15" />
            <span className="size-2 rounded-full bg-foreground/15" />
            <span className="size-2 rounded-full bg-foreground/15" />
          </div>
          <div className="flex min-h-[150px]">
            {/* Sidebar */}
            <div
              className="flex w-32 flex-col gap-1.5 p-3 transition-colors duration-300"
              style={{ background: cSidebar, color: cSidebarFg }}
            >
              <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
                <Triangle
                  className="size-4 fill-current transition-colors duration-300"
                  style={{ color: cPrimario }}
                />
                Vertex
              </span>
              <span
                className="mt-3 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors duration-300"
                style={{ background: cPrimario, color: cPrimarioFg }}
              >
                Vender
              </span>
              <span className="rounded-md px-2.5 py-1.5 text-xs opacity-60">Cobrar</span>
              <span className="rounded-md px-2.5 py-1.5 text-xs opacity-60">Inventario</span>
            </div>
            {/* Lienzo */}
            <div className="flex-1 space-y-3 bg-card p-4">
              <div className="space-y-1.5">
                <div className="h-2.5 w-28 rounded-full bg-foreground/15" />
                <div className="h-2 w-20 rounded-full bg-muted" />
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors duration-300"
                  style={{ background: cPrimario, color: cPrimarioFg }}
                >
                  Botón primario
                </span>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-300"
                  style={{ background: cAcento, color: cAcentoFg }}
                >
                  Acento
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-16 rounded-full bg-foreground/15" />
                  <span
                    className="size-3 rounded-full transition-colors duration-300"
                    style={{ background: cAcento }}
                  />
                </div>
                <div className="h-2 w-full rounded-full bg-muted" />
                <div className="h-2 w-3/4 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>
        <figcaption className="text-xs text-muted-foreground">
          {paleta ? (
            <>
              Vista previa de <span className="font-medium text-foreground">{paleta.nombre}</span>
            </>
          ) : (
            "Vista previa con el tema por defecto de Vertex"
          )}
        </figcaption>
      </figure>

      {/* Galería por familia */}
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSel("")}
          aria-pressed={sel === ""}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            sel === ""
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {sel === "" && <Check className="size-3.5" />}
          Usar tema por defecto
        </button>

        {familias.map((fam) => (
          <div key={fam}>
            <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {fam}
            </p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {PALETAS.filter((p) => p.familia === fam).map((p) => {
                const activo = sel === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSel(p.key)}
                    aria-pressed={activo}
                    title={p.nombre}
                    className={cn(
                      "group relative flex flex-col gap-1.5 rounded-xl border bg-card p-2 text-left transition-all duration-150",
                      activo
                        ? "border-primary ring-2 ring-primary/40 shadow-sm"
                        : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
                    )}
                  >
                    {/* Swatch: 3 colores de la paleta */}
                    <span className="relative flex h-9 overflow-hidden rounded-lg shadow-inner ring-1 ring-black/[0.04]">
                      <span className="flex-1" style={{ background: p.primario }} />
                      <span className="w-1/4" style={{ background: p.acento }} />
                      <span className="w-1/4" style={{ background: p.sidebar }} />
                      {activo && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex size-5 items-center justify-center rounded-full bg-white/95 shadow">
                            <Check className="size-3.5 text-primary" strokeWidth={3} />
                          </span>
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "truncate text-xs font-medium transition-colors",
                        activo ? "text-primary" : "text-foreground",
                      )}
                    >
                      {p.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
