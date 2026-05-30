"use client";

import { useState, useRef, useMemo, useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface OpcionAuto {
  value: string;
  label: string;
  hint?: string;
  derecha?: ReactNode;
}

interface Props {
  opciones: OpcionAuto[];
  onSelect: (value: string) => void;
  filtrar: (opciones: OpcionAuto[], q: string) => OpcionAuto[];
  placeholder?: string;
  limpiarAlSeleccionar?: boolean;
  inputClassName?: string;
  autoFocus?: boolean;
}

export function Autocomplete({ opciones, onSelect, filtrar, placeholder = "Buscar…", limpiarAlSeleccionar = false, inputClassName, autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resultados = useMemo(() => (q.trim() ? filtrar(opciones, q).slice(0, 8) : []), [q, opciones, filtrar]);

  function elegir(value: string) {
    onSelect(value);
    // Modo "buscar y disparar" (productos): se limpia para el siguiente.
    // Modo "seleccionar valor" (cliente): refleja el nombre elegido.
    if (limpiarAlSeleccionar) setQ("");
    else setQ(opciones.find((o) => o.value === value)?.label ?? "");
    setAbierto(false);
    setActivo(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!abierto && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setAbierto(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { if (resultados[activo]) { e.preventDefault(); elegir(resultados[activo].value); } }
    else if (e.key === "Escape") { setAbierto(false); }
  }

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listId}
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); setActivo(0); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setAbierto(false), 120); }}
        onKeyDown={onKeyDown}
      />
      {abierto && resultados.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[60] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md"
          onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
        >
          {resultados.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === activo}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(o.value)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
                i === activo ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
              )}
            >
              <span className="min-w-0 truncate">
                {o.label}
                {o.hint && <span className="ml-1 text-xs text-muted-foreground">{o.hint}</span>}
              </span>
              {o.derecha && <span className="shrink-0 tabular text-sm font-medium">{o.derecha}</span>}
            </li>
          ))}
        </ul>
      )}
      {abierto && q.trim() && resultados.length === 0 && (
        <div className="absolute z-[60] mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Sin resultados
        </div>
      )}
    </div>
  );
}
