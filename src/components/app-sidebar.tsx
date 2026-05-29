"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/modules";
import { puede, type Permiso } from "@/lib/auth/roles";
import { VertexWordmark } from "@/components/vertex-mark";
import { cn } from "@/lib/utils";

/** Contenido del nav, reutilizable en el aside (desktop) y el drawer (móvil). */
export function SidebarNav({ rol, onNavigate }: { rol: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();

  const grupos = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => puede(rol, `${it.modulo}.ver` as Permiso)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <VertexWordmark />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-5">
            <p className="px-2 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {grupo.titulo}
            </p>
            <ul className="space-y-0.5">
              {grupo.items.map((item) => {
                const Icon = item.icon;
                const activo = pathname === item.href || pathname.startsWith(item.href + "/");

                // Módulos aún no implementados: no son enlaces (evita 404 al navegar/prefetch).
                if (!item.listo) {
                  return (
                    <li key={item.href}>
                      <div
                        aria-disabled
                        title="Disponible próximamente"
                        className="flex cursor-not-allowed items-center gap-3 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/40"
                      >
                        <Icon className="size-4 shrink-0 text-sidebar-foreground/30" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="rounded bg-sidebar-foreground/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-sidebar-foreground/50">
                          pronto
                        </span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                        activo
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          activo ? "text-primary" : "text-sidebar-foreground/50",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3 text-[0.68rem] text-sidebar-foreground/40">
        Vertex ERP · v0.1
      </div>
    </div>
  );
}

/** Sidebar fijo en escritorio (oculto en móvil). */
export function AppSidebar({ rol }: { rol: string | null }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">
      <SidebarNav rol={rol} />
    </aside>
  );
}
