"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEmpresaAction } from "@/lib/auth/empresa-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";

interface Props {
  empresas: { id: number; nombre: string }[];
  activaId: number | null;
}

/** Selector de empresa activa (solo superadmin). */
export function EmpresaSwitcher({ empresas, activaId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function cambiar(v: string | null) {
    if (!v) return;
    start(async () => {
      await cambiarEmpresaAction(Number(v));
      router.refresh();
    });
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {pending ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <Building2 className="size-4 text-muted-foreground" />
      )}
      <Select value={activaId ? String(activaId) : undefined} onValueChange={cambiar}>
        <SelectTrigger className="h-9 w-48 border-dashed">
          <SelectValue placeholder="Elegir empresa…" />
        </SelectTrigger>
        <SelectContent>
          {empresas.map((e) => (
            <SelectItem key={e.id} value={String(e.id)}>
              {e.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
