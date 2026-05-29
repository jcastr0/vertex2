"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { construirCalendario } from "@/lib/domain/calendario";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function aISO(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function formatear(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]?.toLowerCase()} ${y}`;
}

interface Props {
  name?: string;
  value?: string; // ISO yyyy-mm-dd
  defaultValue?: string;
  onChange?: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

/** Selector de fecha con calendario en popover. Value en ISO yyyy-mm-dd. */
export function DatePicker({ name, value, defaultValue, onChange, placeholder = "Elegir fecha", className }: Props) {
  const hoy = new Date();
  const [interno, setInterno] = useState(defaultValue ?? "");
  const actual = value !== undefined ? value : interno;
  const [open, setOpen] = useState(false);

  const ref = actual ? actual.split("-").map(Number) : [hoy.getFullYear(), hoy.getMonth() + 1, 1];
  const [vista, setVista] = useState({ y: ref[0], m: ref[1] - 1 });

  const celdas = construirCalendario(vista.y, vista.m);

  function elegir(d: number) {
    const iso = aISO(vista.y, vista.m, d);
    if (value === undefined) setInterno(iso);
    onChange?.(iso);
    setOpen(false);
  }
  function mover(delta: number) {
    setVista((v) => {
      const nm = v.m + delta;
      if (nm < 0) return { y: v.y - 1, m: 11 };
      if (nm > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m: nm };
    });
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={actual} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            !actual && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 opacity-60" />
          <span className="flex-1 truncate">{actual ? formatear(actual) : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3">
          <div className="mb-2 flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => mover(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-sm font-medium">{MESES[vista.m]} {vista.y}</div>
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => mover(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((d, i) => {
              if (d === null) return <div key={i} />;
              const iso = aISO(vista.y, vista.m, d);
              const sel = iso === actual;
              const esHoy = iso === aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => elegir(d)}
                  className={cn(
                    "tabular flex size-9 items-center justify-center rounded-md text-sm hover:bg-accent",
                    sel && "bg-primary text-primary-foreground hover:bg-primary",
                    !sel && esHoy && "ring-1 ring-primary/40",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
