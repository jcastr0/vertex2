"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, ListTree } from "lucide-react";

export function CuentaRowActions({ id, puedeEditar }: { id: number; puedeEditar: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/tesoreria/${id}`)}>
          <ListTree className="size-4" /> Ver extracto
        </DropdownMenuItem>
        {puedeEditar && (
          <DropdownMenuItem onClick={() => router.push(`/tesoreria/${id}/editar`)}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
