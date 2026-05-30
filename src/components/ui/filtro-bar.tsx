"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";
import { aplicarFiltro, limpiarFiltros, filtrosActivos, type FiltroDef } from "@/lib/domain/filtros";
import { Search, SlidersHorizontal, X } from "lucide-react";

export function FiltroBar({ placeholder = "Buscar…", filtros = [] }: { placeholder?: string; filtros?: FiltroDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const primera = useRef(true);

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

  const activos = filtrosActivos(params, filtros);
  const tieneAlgo = !!params.get("q") || activos.length > 0;

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
          <Popover>
            <PopoverTrigger className={buttonVariants({ variant: "outline" }) + " shrink-0 gap-1.5"}>
              <SlidersHorizontal className="size-4" /> Filtros
              {activos.length > 0 && <Badge className="ml-1 size-5 justify-center p-0">{activos.length}</Badge>}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3">
              {filtros.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  {f.tipo === "select" ? (
                    <select value={params.get(f.key) ?? ""} onChange={(e) => cambiar(f.key, e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm">
                      <option value="">Todos</option>
                      {f.opciones?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input type="date" value={params.get(f.key) ?? ""} onChange={(e) => cambiar(f.key, e.target.value)} className="h-10" />
                  )}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}
        {tieneAlgo && (
          <Button variant="ghost" className="shrink-0" onClick={limpiarTodo}>Limpiar</Button>
        )}
      </div>
      {activos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activos.map((a) => (
            <button key={a.key} type="button" onClick={() => cambiar(a.key, "")} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs">
              <span className="text-muted-foreground">{a.label}:</span> {a.valor}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
