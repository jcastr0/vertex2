"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Bell, PackageX, CalendarClock, HandCoins, ShieldAlert, CheckCircle2, ChevronRight, type LucideIcon } from "lucide-react";

export interface AlertaItem {
  clave: "stock" | "cartera" | "cobros" | "novedades";
  titulo: string;
  detalle: string;
  count: number;
  href: string;
}

const ICONO: Record<AlertaItem["clave"], LucideIcon> = {
  stock: PackageX,
  cartera: CalendarClock,
  cobros: HandCoins,
  novedades: ShieldAlert,
};

/**
 * Campanita de pendientes en la barra superior. Recibe las alertas de la empresa
 * activa (calculadas en el servidor) y muestra un contador visible en todas las
 * pantallas; al abrir, cada pendiente lleva directo a resolverlo.
 */
export function AlertasCampana({ items }: { items: AlertaItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const total = items.reduce((a, i) => a + i.count, 0);

  function ir(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
        aria-label={total > 0 ? `${total} pendientes` : "Sin pendientes"}
      >
        <Bell className="size-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Pendientes" description={total > 0 ? "Cosas que vale la pena atender hoy." : undefined}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-8 text-primary" />
            Todo al día. No hay pendientes.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((a) => {
              const Icon = ICONO[a.clave];
              return (
                <li key={a.clave}>
                  <button
                    type="button"
                    onClick={() => ir(a.href)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{a.titulo}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.detalle}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold tabular text-destructive">
                      {a.count}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
