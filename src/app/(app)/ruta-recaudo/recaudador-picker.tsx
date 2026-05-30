"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchSelect } from "@/components/ui/search-select";
import { Loader2, UserRound } from "lucide-react";

export function RecaudadorPicker({
  recaudadores,
  actual,
}: {
  recaudadores: { id: number; nombre: string }[];
  actual: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <UserRound className="size-4 text-muted-foreground" />}
      <SearchSelect
        value={actual ? String(actual) : ""}
        onValueChange={(v) => start(() => router.push(`/ruta-recaudo?recaudador=${v}`))}
        placeholder="Elegir recaudador…"
        triggerClassName="h-9 w-56"
        options={recaudadores.map((r) => ({ value: String(r.id), label: r.nombre }))}
      />
    </div>
  );
}
