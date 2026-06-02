"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { buscarGlobalAction } from "@/app/(app)/busqueda-actions";
import type { ResultadoBusqueda } from "@/lib/services/busqueda";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";

/**
 * Búsqueda global (Ctrl/⌘+K). Pregunta al servidor en cada consulta, así siempre
 * busca en la empresa activa. Teclado: ↑/↓ para moverse, Enter para abrir.
 */
export function BusquedaGlobal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ResultadoBusqueda[]>([]);
  const [activo, setActivo] = useState(0);
  const [cargando, startBuscar] = useTransition();

  // Atajo global ⌘K / Ctrl+K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Búsqueda con pequeño retraso (debounce) en cada cambio del texto.
  useEffect(() => {
    if (!open) return;
    const texto = q.trim();
    if (texto.length < 2) {
      setItems([]);
      setActivo(0);
      return;
    }
    const t = setTimeout(() => {
      startBuscar(async () => {
        const r = await buscarGlobalAction(texto);
        setItems(r);
        setActivo(0);
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const abrir = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      setItems([]);
      router.push(href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[activo]) {
      e.preventDefault();
      abrir(items[activo].href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted sm:w-56 sm:justify-between"
        aria-label="Buscar"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          <span className="hidden sm:inline">Buscar…</span>
        </span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Buscar" className="sm:max-w-lg">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Producto, cliente, factura, pedido…"
              className="pl-9"
            />
            {cargando && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {q.trim().length >= 2 && !cargando && items.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nada encontrado para “{q.trim()}”.</p>
            )}
            {q.trim().length < 2 && (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">Escribe al menos 2 letras. Busca en la empresa actual.</p>
            )}
            <ul className="space-y-0.5">
              {items.map((r, i) => (
                <li key={`${r.href}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => abrir(r.href)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm outline-none ${
                      i === activo ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {r.tipo}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.titulo}</span>
                        {r.subtitulo && <span className="block truncate text-xs text-muted-foreground">{r.subtitulo}</span>}
                      </span>
                    </span>
                    {i === activo && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
