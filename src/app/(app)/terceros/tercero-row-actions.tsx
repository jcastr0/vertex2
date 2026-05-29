"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoTerceroAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";

interface Props {
  id: number;
  nombre: string;
  activo: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export function TerceroRowActions({ id, nombre, activo, puedeEditar, puedeEliminar }: Props) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await cambiarEstadoTerceroAction(id, !activo);
      setConfirmar(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {puedeEditar && (
            <DropdownMenuItem onClick={() => router.push(`/terceros/${id}/editar`)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
          )}
          {activo && puedeEliminar && (
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmar(true)}>
              <PowerOff className="size-4" /> Desactivar
            </DropdownMenuItem>
          )}
          {!activo && puedeEditar && (
            <DropdownMenuItem onClick={toggle}>
              <Power className="size-4" /> Reactivar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar “{nombre}”?</AlertDialogTitle>
            <AlertDialogDescription>
              El tercero dejará de aparecer en nuevas operaciones. Podrás reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggle} disabled={pending}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
