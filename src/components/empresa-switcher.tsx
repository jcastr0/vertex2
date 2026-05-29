"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEmpresaAction } from "@/lib/auth/empresa-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { Building2, Loader2 } from "lucide-react";

interface Props {
  empresas: { id: number; nombre: string }[];
  activaId: number | null;
}

/** Selector de empresa activa (solo superadmin). Muestra el nombre y permite buscar. */
export function EmpresaSwitcher({ empresas, activaId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function cambiar(v: string) {
    if (!v) return;
    start(async () => {
      await cambiarEmpresaAction(Number(v));
      router.refresh();
    });
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {pending ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
      )}
      <SearchSelect
        value={activaId ? String(activaId) : ""}
        onValueChange={cambiar}
        placeholder="Elegir empresa…"
        searchPlaceholder="Buscar empresa…"
        triggerClassName="h-9 w-52 border-dashed"
        options={empresas.map((e) => ({ value: String(e.id), label: e.nombre }))}
      />
    </div>
  );
}
