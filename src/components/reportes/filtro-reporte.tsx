"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import type { FiltroSpec } from "@/lib/reportes/tipos";

export function FiltroReporte({ filtros }: { filtros: FiltroSpec[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  function set(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
      {filtros.map((f) =>
        f.tipo === "fecha" ? (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input type="date" defaultValue={sp.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} className="h-9 w-full sm:w-auto" />
          </div>
        ) : (
          <div key={f.key} className="space-y-1 sm:min-w-44">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <SearchSelect value={sp.get(f.key) ?? "0"} onValueChange={(v) => set(f.key, v === "0" ? "" : v)} options={[{ value: "0", label: "Todos" }, ...(f.opciones ?? [])]} />
          </div>
        ),
      )}
    </div>
  );
}
