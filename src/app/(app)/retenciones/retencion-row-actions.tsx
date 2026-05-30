"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoRetencionAction } from "./actions";
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
  activa: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export function RetencionRowActions({ id, nombre, activa, puedeEditar, puedeEliminar }: Props) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await cambiarEstadoRetencionAction(id, !activa);
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
            <DropdownMenuItem onClick={() => router.push(`/retenciones/${id}/editar`)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
          )}
          {activa && puedeEliminar && (
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmar(true)}>
              <PowerOff className="size-4" /> Desactivar
            </DropdownMenuItem>
          )}
          {!activa && puedeEditar && (
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
              Dejará de descontarse en los próximos pagos a proveedores.
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
