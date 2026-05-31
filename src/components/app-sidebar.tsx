"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, ubicarRuta } from "@/lib/modules";
import { puede, type Permiso } from "@/lib/auth/roles";
import { VertexWordmark, VertexMark } from "@/components/vertex-mark";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";

const KEY_COL = "vx_sidebar_colapsado";
const KEY_GRP = "vx_sidebar_grupos";

/**
 * Navegación de Vertex. Grupos en acordeón con líneas tipo árbol/timeline,
 * señalización clara de grupo/ítem activo y modo colapsado (riel de iconos).
 * Reutilizable en el aside (escritorio) y el drawer (móvil).
 */
export function SidebarNav({
  permisos,
  onNavigate,
  colapsado = false,
  onToggleColapsar,
}: {
  permisos: string[];
  onNavigate?: () => void;
  colapsado?: boolean;
  onToggleColapsar?: () => void;
}) {
  const pathname = usePathname();
  const activo = ubicarRuta(pathname);

  const grupos = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => puede(permisos, `${it.modulo}.ver` as Permiso)),
  })).filter((g) => g.items.length > 0);

  // Acordeón: el grupo activo abre por defecto; el usuario puede togglear (persistido).
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let guardado: Record<string, boolean> = {};
    try {
      guardado = JSON.parse(localStorage.getItem(KEY_GRP) ?? "{}");
    } catch {
      guardado = {};
    }
    if (activo && guardado[activo.grupo.slug] === undefined) guardado[activo.grupo.slug] = true;
    setAbiertos(guardado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo?.grupo.slug]);

  function toggleGrupo(slug: string) {
    setAbiertos((prev) => {
      const next = { ...prev, [slug]: !prev[slug] };
      try {
        localStorage.setItem(KEY_GRP, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Marca */}
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border", colapsado ? "justify-center px-0" : "px-5")}>
        <Link href="/dashboard" onClick={onNavigate} aria-label="Vertex">
          {colapsado ? <VertexMark className="size-7" /> : <VertexWordmark />}
        </Link>
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-3", colapsado ? "px-2" : "px-3")}>
        {grupos.map((grupo) => {
          const GroupIcon = grupo.icon;
          const grupoActivo = activo?.grupo.slug === grupo.slug;
          const abierto = colapsado ? true : (abiertos[grupo.slug] ?? grupoActivo);

          // ── Modo colapsado: riel de iconos por grupo ──────────────────────
          if (colapsado) {
            return (
              <div key={grupo.slug} className="mb-2 border-b border-sidebar-border/40 pb-2 last:border-0">
                <ul className="space-y-1">
                  {grupo.items.map((item) => {
                    const Icon = item.icon;
                    const itemActivo = activo?.item.href === item.href;
                    if (!item.listo) return null;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          title={item.label}
                          className={cn(
                            "relative flex items-center justify-center rounded-lg py-2.5 transition-colors",
                            itemActivo
                              ? "bg-sidebar-accent text-primary"
                              : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          )}
                        >
                          {itemActivo && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />}
                          <Icon className="size-[1.15rem] shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }

          // ── Modo expandido: acordeón con líneas tipo árbol ────────────────
          return (
            <div key={grupo.slug} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGrupo(grupo.slug)}
                aria-expanded={abierto}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  grupoActivo
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                )}
              >
                <GroupIcon className={cn("size-[1.05rem] shrink-0 transition-colors", grupoActivo ? "text-primary" : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70")} />
                <span className="flex-1 truncate text-left">{grupo.titulo}</span>
                {grupoActivo && !abierto && <span className="size-1.5 rounded-full bg-primary" />}
                <ChevronDown className={cn("size-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200", abierto && "rotate-180")} />
              </button>

              {/* Items con guía vertical (timeline) y nodos */}
              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <ul className="relative ml-[1.35rem] mt-0.5 mb-1 space-y-0.5 border-l border-sidebar-border pl-3 pt-0.5">
                    {grupo.items.map((item) => {
                      const Icon = item.icon;
                      const itemActivo = activo?.item.href === item.href;

                      if (!item.listo) {
                        return (
                          <li key={item.href} className="relative">
                            <span className="absolute -left-3 top-1/2 h-px w-2 -translate-y-1/2 bg-sidebar-border" />
                            <div
                              aria-disabled
                              title="Disponible próximamente"
                              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/35"
                            >
                              <Icon className="size-4 shrink-0" />
                              <span className="flex-1 truncate">{item.label}</span>
                              <span className="rounded bg-sidebar-foreground/10 px-1.5 py-0.5 text-[0.6rem] font-medium">pronto</span>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li key={item.href} className="group/item relative">
                          {/* conector horizontal hacia la guía */}
                          <span
                            className={cn(
                              "absolute -left-3 top-1/2 h-px w-2 -translate-y-1/2 transition-colors",
                              itemActivo ? "bg-primary" : "bg-sidebar-border group-hover/item:bg-sidebar-foreground/40",
                            )}
                          />
                          {/* nodo */}
                          <span
                            className={cn(
                              "absolute -left-[0.3rem] top-1/2 size-1.5 -translate-y-1/2 rounded-full transition-all",
                              itemActivo
                                ? "scale-125 bg-primary ring-2 ring-primary/25"
                                : "bg-sidebar-border group-hover/item:bg-sidebar-foreground/50",
                            )}
                          />
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                              itemActivo
                                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            )}
                          >
                            <Icon className={cn("size-4 shrink-0", itemActivo ? "text-primary" : "text-sidebar-foreground/45")} />
                            <span className="flex-1 truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Pie: colapsar (solo escritorio) */}
      <div className="border-t border-sidebar-border p-2">
        {onToggleColapsar ? (
          <button
            type="button"
            onClick={onToggleColapsar}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              colapsado && "justify-center px-0",
            )}
            title={colapsado ? "Expandir" : "Colapsar"}
          >
            {colapsado ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Colapsar</>}
          </button>
        ) : (
          <p className="px-3 py-1 text-[0.68rem] text-sidebar-foreground/40">Vertex ERP · v0.1</p>
        )}
      </div>
    </div>
  );
}

/** Sidebar fijo en escritorio (oculto en móvil), con colapso persistente. */
export function AppSidebar({ permisos }: { permisos: string[] }) {
  const [colapsado, setColapsado] = useState(false);
  useEffect(() => {
    setColapsado(localStorage.getItem(KEY_COL) === "1");
  }, []);
  function toggle() {
    setColapsado((c) => {
      const next = !c;
      try {
        localStorage.setItem(KEY_COL, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-out md:block",
        colapsado ? "w-[4.5rem]" : "w-64",
      )}
    >
      <SidebarNav permisos={permisos} colapsado={colapsado} onToggleColapsar={toggle} />
    </aside>
  );
}
