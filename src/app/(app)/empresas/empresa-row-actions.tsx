"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoEmpresaAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";

export function EmpresaRowActions({ id, activa }: { id: number; activa: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function toggle() {
    start(async () => {
      await cambiarEstadoEmpresaAction(id, !activa);
      router.refresh();
    });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/empresas/${id}/editar`)}>
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggle} disabled={pending} variant={activa ? "destructive" : "default"}>
          {activa ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          {activa ? "Desactivar" : "Reactivar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
