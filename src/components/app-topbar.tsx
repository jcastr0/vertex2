"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { NAV } from "@/lib/modules";
import { MobileNav } from "@/components/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, LogOut, ChevronDown } from "lucide-react";

interface Props {
  nombre: string;
  email: string;
  rol: string | null;
  empresa: string | null;
}

function tituloDeRuta(pathname: string): string {
  for (const grupo of NAV) {
    for (const item of grupo.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return item.label;
      }
    }
  }
  return "Vertex";
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AppTopbar({ nombre, email, rol, empresa }: Props) {
  const titulo = tituloDeRuta(usePathname());
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2 sm:gap-3">
        <MobileNav rol={rol} />
        <h1 className="text-lg font-semibold tracking-tight">{titulo}</h1>
        {rol && (
          <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
            {rol}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {empresa && (
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Building2 className="size-4" />
            {empresa}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-muted">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {iniciales(nombre)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{nombre}</div>
              <div className="text-xs font-normal text-muted-foreground">{email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-destructive outline-none hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
