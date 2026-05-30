"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoUsuarioAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";

export function UsuarioRowActions({ id, activo }: { id: number; activo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function toggle() {
    start(async () => {
      await cambiarEstadoUsuarioAction(id, !activo);
      router.refresh();
    });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/usuarios/${id}/editar`)}>
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggle} disabled={pending} variant={activo ? "destructive" : "default"}>
          {activo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          {activo ? "Desactivar" : "Reactivar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
