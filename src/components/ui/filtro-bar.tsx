"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { aplicarFiltro, limpiarFiltros, filtrosActivos, type FiltroDef } from "@/lib/domain/filtros";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

export function FiltroBar({ placeholder = "Buscar…", filtros = [] }: { placeholder?: string; filtros?: FiltroDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const primera = useRef(true);

  const activos = filtrosActivos(params, filtros);
  // Si se llega con filtros aplicados en la URL, el panel abre solo.
  const [abierto, setAbierto] = useState(activos.length > 0);
  const tieneAlgo = !!params.get("q") || activos.length > 0;

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (q.trim()) sp.set("q", q.trim()); else sp.delete("q");
      sp.delete("page");
      router.replace(`${pathname}?${sp.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function cambiar(key: string, value: string) {
    router.replace(`${pathname}?${aplicarFiltro(params, key, value).toString()}`);
  }
  function limpiarTodo() {
    setQ("");
    router.replace(`${pathname}?${limpiarFiltros(params, filtros.map((f) => f.key)).toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" />
        </div>
        {filtros.length > 0 && (
          <Button
            type="button"
            variant={abierto ? "secondary" : "outline"}
            className="shrink-0 gap-1.5"
            aria-expanded={abierto}
            onClick={() => setAbierto((v) => !v)}
          >
            <SlidersHorizontal className="size-4" /> Filtros
            {activos.length > 0 && (
              <Badge className="ml-0.5 size-5 justify-center p-0 tabular">{activos.length}</Badge>
            )}
            <ChevronDown className={cn("size-4 transition-transform duration-200", abierto && "rotate-180")} />
          </Button>
        )}
        {tieneAlgo && (
          <Button variant="ghost" className="shrink-0" onClick={limpiarTodo}>Limpiar</Button>
        )}
      </div>

      {/* Panel colapsable: transición de altura con grid-rows (sin saltos). */}
      {filtros.length > 0 && (
        <div
          className={cn(
            "grid transition-all duration-200 ease-out",
            abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtros.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  {f.tipo === "select" ? (
                    <select
                      value={params.get(f.key) ?? ""}
                      onChange={(e) => cambiar(f.key, e.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                    >
                      <option value="">Todos</option>
                      {f.opciones?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input type="date" value={params.get(f.key) ?? ""} onChange={(e) => cambiar(f.key, e.target.value)} className="h-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chips de filtros activos: visibles aunque el panel esté colapsado. */}
      {activos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activos.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => cambiar(a.key, "")}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs transition-colors hover:bg-muted/60"
            >
              <span className="text-muted-foreground">{a.label}:</span> {a.valor}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
