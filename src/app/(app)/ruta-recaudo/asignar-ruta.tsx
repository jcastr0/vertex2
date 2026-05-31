"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { asignarRecaudoAction, type AsignarState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DIAS_COBRO } from "@/lib/domain/ruta-recaudo";
import { AlertCircle, Loader2, Search, Check, UserRound, CalendarDays } from "lucide-react";

interface Cliente { id: number; nombre: string; recaudadorId: number | null; recaudador: string | null; diaCobro: number | null; saldo: number }
interface Props { clientes: Cliente[]; recaudadores: { id: number; nombre: string }[] }

const money = (n: number) => "$" + n.toLocaleString("es-CO");
const diaLabel = (d: number | null) => DIAS_COBRO.find((x) => x.value === d)?.label ?? null;

function Aplicar({ n }: { n: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || n === 0}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      Programar {n > 0 ? `(${n})` : ""}
    </Button>
  );
}

export function AsignarRuta({ clientes, recaudadores }: Props) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [recaudadorId, setRecaudadorId] = useState("0");
  const [diaCobro, setDiaCobro] = useState("0");
  const [q, setQ] = useState("");
  const [soloDeben, setSoloDeben] = useState(true);
  const [state, formAction] = useActionState<AsignarState, FormData>(asignarRecaudoAction, {});

  useEffect(() => {
    if (state.ok) { setSel(new Set()); router.refresh(); }
  }, [state.ok, router]);

  const conDeuda = useMemo(() => clientes.filter((c) => c.saldo > 0).length, [clientes]);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return clientes.filter((c) => {
      if (soloDeben && c.saldo <= 0) return false;
      if (t && !c.nombre.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [clientes, q, soloDeben]);

  const todosSel = lista.length > 0 && lista.every((c) => sel.has(c.id));
  function toggle(id: number) {
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleTodos() {
    setSel((s) => {
      const n = new Set(s);
      if (todosSel) lista.forEach((c) => n.delete(c.id));
      else lista.forEach((c) => n.add(c.id));
      return n;
    });
  }

  const opcionesRec = [{ value: "0", label: "Sin asignar" }, ...recaudadores.map((r) => ({ value: String(r.id), label: r.nombre }))];
  const opcionesDia = [{ value: "0", label: "Sin día fijo" }, ...DIAS_COBRO.map((d) => ({ value: String(d.value), label: d.label }))];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clienteIds" value={JSON.stringify([...sel])} />
      <input type="hidden" name="recaudadorId" value={recaudadorId} />
      <input type="hidden" name="diaCobro" value={diaCobro} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}
      {state.ok && state.asignados ? (
        <div role="status" className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          <Check className="size-4 shrink-0" /> Programados {state.asignados} cliente(s).
        </div>
      ) : null}

      {/* Barra de programación */}
      <div className="sticky top-2 z-10 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium">A los seleccionados, asígnales:</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="size-3.5" /> Recaudador</Label>
            <SearchSelect value={recaudadorId} onValueChange={setRecaudadorId} options={opcionesRec} />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Día de cobro</Label>
            <SearchSelect value={diaCobro} onValueChange={setDiaCobro} options={opcionesDia} searchThreshold={99} />
          </div>
          <Aplicar n={sel.size} />
        </div>
      </div>

      {/* Buscador + seleccionar todos */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" className="h-9 border-0 px-0 shadow-none focus-visible:ring-0" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={toggleTodos}>
          {todosSel ? "Quitar todos" : "Seleccionar todos"}
        </Button>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <span className="text-sm">
          <span className="font-medium">Solo los que me deben</span>
          <span className="ml-2 text-xs text-muted-foreground">{conDeuda} con deuda · {clientes.length} en total</span>
        </span>
        <Switch checked={soloDeben} onCheckedChange={setSoloDeben} />
      </label>

      {/* Lista de clientes */}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {lista.map((c) => {
          const marcado = sel.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${marcado ? "bg-primary/5" : "hover:bg-muted/30"}`}
              >
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${marcado ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {marcado && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.recaudador ? (
                      <>{c.recaudador}{diaLabel(c.diaCobro) ? ` · ${diaLabel(c.diaCobro)}` : ""}</>
                    ) : (
                      <span className="text-amber-600">Sin recaudador</span>
                    )}
                  </span>
                </span>
                {c.saldo > 0 && <Badge variant="outline" className="shrink-0 font-normal tabular">{money(c.saldo)}</Badge>}
              </button>
            </li>
          );
        })}
        {lista.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Ningún cliente coincide.</li>}
      </ul>
    </form>
  );
}
