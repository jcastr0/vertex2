"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Search } from "lucide-react";

export interface OpcionSelect {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  options: OpcionSelect[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Si se define, envía el valor en formularios (input oculto). */
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Mostrar buscador a partir de esta cantidad de opciones (def. 5). */
  searchThreshold?: number;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Combobox accesible. Cuando hay más de `searchThreshold` opciones, muestra un
 * buscador. Se renderiza en portal con z-index alto (no se recorta en modales).
 */
export function SearchSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  placeholder = "Selecciona…",
  searchPlaceholder = "Buscar…",
  searchThreshold = 5,
  disabled,
  className,
  triggerClassName,
}: Props) {
  const [interno, setInterno] = useState(defaultValue ?? "");
  const actual = value !== undefined ? value : interno;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const seleccionada = options.find((o) => o.value === actual);
  const conBuscador = options.length > searchThreshold;

  const filtradas = useMemo(() => {
    if (!conBuscador || !q.trim()) return options;
    const t = q.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(t) || o.hint?.toLowerCase().includes(t),
    );
  }, [options, q, conBuscador]);

  function elegir(v: string) {
    if (value === undefined) setInterno(v);
    onValueChange?.(v);
    setOpen(false);
    setQ("");
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={actual} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            !seleccionada && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{seleccionada ? seleccionada.label : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-(--anchor-width) min-w-[12rem] p-0", className)}
          sideOffset={4}
        >
          {conBuscador && (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1">
            {filtradas.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filtradas.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => elegir(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    o.value === actual && "bg-accent/50",
                  )}
                >
                  <Check className={cn("size-4 shrink-0", o.value === actual ? "opacity-100 text-primary" : "opacity-0")} />
                  <span className="flex-1 truncate">
                    {o.label}
                    {o.hint && <span className="ml-1 text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
