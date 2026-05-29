import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  total: number;
  page: number;
  pageSize: number;
  /** Construye el href para una página dada (conserva otros params). */
  hrefForPage: (page: number) => string;
}

/** Paginación simple: anterior/siguiente + rango mostrado. */
export function Pagination({ total, page, pageSize, hrefForPage }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  if (totalPaginas <= 1) return null;
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(total, page * pageSize);

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        <span className="tabular">{desde}–{hasta}</span> de <span className="tabular">{total}</span>
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefForPage(page - 1)}
          aria-disabled={page <= 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="size-4" /> Anterior
        </Link>
        <Link
          href={hrefForPage(page + 1)}
          aria-disabled={page >= totalPaginas}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= totalPaginas && "pointer-events-none opacity-50",
          )}
        >
          Siguiente <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
