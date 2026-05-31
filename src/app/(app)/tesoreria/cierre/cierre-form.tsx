// src/app/(app)/tesoreria/cierre/cierre-form.tsx
"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { registrarCierreAction, type CierreState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

interface Cuenta { id: number; nombre: string; tipo: string; esEfectivo: boolean; esperado: number }
const money = (n: number) => "$" + n.toLocaleString("es-CO");

function Cerrar() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Cerrar día</Button>; }

export function CierreForm({ cuentas, hoy }: { cuentas: Cuenta[]; hoy: string }) {
  const [state, action] = useActionState<CierreState, FormData>(registrarCierreAction, {});
  const [conteos, setConteos] = useState<Record<number, string>>({});
  const conteosJson = JSON.stringify(cuentas.filter((c) => c.esEfectivo && conteos[c.id]).map((c) => ({ cuentaId: c.id, montoContado: Number(conteos[c.id]) })));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="fecha" value={hoy} />
      <input type="hidden" name="conteosJson" value={conteosJson} />
      {state.error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" /> {state.error}</div>}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {cuentas.map((c) => {
          const contado = Number(conteos[c.id]);
          const dif = c.esEfectivo && conteos[c.id] ? contado - c.esperado : null;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="min-w-0 flex-1"><span className="font-medium">{c.nombre}</span> <span className="text-xs text-muted-foreground">· {c.tipo}</span></span>
              <span className="text-sm text-muted-foreground">esperado <span className="tabular font-medium text-foreground">{money(c.esperado)}</span></span>
              {c.esEfectivo ? (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">contado</Label>
                  <Input type="number" step="0.01" className="h-9 w-32 tabular" value={conteos[c.id] ?? ""} onChange={(e) => setConteos((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="0" />
                  {dif != null && <span className={`tabular text-sm font-medium ${dif === 0 ? "text-primary" : "text-destructive"}`}>{dif > 0 ? "+" : ""}{money(dif)}</span>}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">conciliación (banco)</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="space-y-1.5"><Label htmlFor="obs">Observaciones</Label><Textarea id="obs" name="observaciones" rows={2} placeholder="Notas del cierre (opcional)" /></div>
      <Cerrar />
    </form>
  );
}
