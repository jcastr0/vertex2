"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { ubicarRuta, grupoPorSlug } from "@/lib/modules";
import { MobileNav } from "@/components/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmpresaSwitcher } from "@/components/empresa-switcher";
import { Building2, LogOut, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  nombre: string;
  email: string;
  rol: string | null;
  permisos: string[];
  empresa: string | null;
  empresas: { id: number; nombre: string }[];
  empresaActivaId: number | null;
}

/** Migas de pan: Grupo (enlaza a su página) › Página actual. */
function Breadcrumb({ pathname }: { pathname: string }) {
  // Página de grupo (/g/[slug]): el grupo es la página actual.
  if (pathname.startsWith("/g/")) {
    const slug = pathname.split("/")[2] ?? "";
    const grupo = grupoPorSlug(slug);
    return (
      <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-lg font-semibold tracking-tight">
        <span className="truncate">{grupo?.titulo ?? "Vertex"}</span>
      </nav>
    );
  }
  const ubic = ubicarRuta(pathname);
  if (!ubic) return <h1 className="text-lg font-semibold tracking-tight">Vertex</h1>;
  const { grupo, item } = ubic;
  return (
    <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5">
      <Link
        href={`/g/${grupo.slug}`}
        className="hidden shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
      >
        {grupo.titulo}
      </Link>
      <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/50 sm:inline" />
      <h1 className="truncate text-lg font-semibold tracking-tight">{item.label}</h1>
    </nav>
  );
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AppTopbar({ nombre, email, rol, permisos, empresa, empresas, empresaActivaId }: Props) {
  const pathname = usePathname();
  const esSuperadmin = empresas.length > 0;
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav permisos={permisos} />
        <Breadcrumb pathname={pathname} />
        {rol && (
          <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
            {rol}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {esSuperadmin ? (
          <EmpresaSwitcher empresas={empresas} activaId={empresaActivaId} />
        ) : (
          empresa && (
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Building2 className="size-4" />
              {empresa}
            </div>
          )
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
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="font-medium">{nombre}</div>
                <div className="text-xs font-normal text-muted-foreground">{email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
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
