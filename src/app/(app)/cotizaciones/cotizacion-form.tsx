"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearCotizacionAction, preciosClienteAction, type CotizacionState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string; precio: number }
interface Linea { productoId: string; cantidad: string; precioUnitario: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar cotización
    </Button>
  );
}

export function CotizacionForm({ clientes, productos, hoy }: { clientes: Opt[]; productos: Prod[]; hoy: string }) {
  const [state, action] = useActionState<CotizacionState, FormData>(crearCotizacionAction, {});
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ productoId: "", cantidad: "", precioUnitario: "" }]);
  const [preciosCliente, setPreciosCliente] = useState<Record<number, number>>({});
  const [, startPrecios] = useTransition();

  const prodPorId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);

  function elegirCliente(v: string) {
    setClienteId(v);
    startPrecios(async () => setPreciosCliente(await preciosClienteAction(Number(v))));
  }

  function precioSugerido(productoId: string): number {
    const pid = Number(productoId);
    return preciosCliente[pid] ?? prodPorId.get(productoId)?.precio ?? 0;
  }

  function elegirProducto(i: number, productoId: string) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, productoId, precioUnitario: String(precioSugerido(productoId)) } : l)));
  }

  const set = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = useMemo(() => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0), [lineas]);

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.productoId && Number(l.cantidad) > 0)
      .map((l) => ({ productoId: Number(l.productoId), cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario) || 0 })),
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title="Datos de la cotización" description="Cliente y fecha.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cliente" required>
            <SearchSelect value={clienteId} onValueChange={elegirCliente} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
          </Field>
          <Field label="Fecha">
            <DatePicker name="fecha" defaultValue={hoy} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Productos" description="Lo que pidió el cliente. El precio se sugiere de la última venta a este cliente." bodyClassName="space-y-3">
        {lineas.map((l, i) => {
          const pid = Number(l.productoId);
          const ultimo = preciosCliente[pid];
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Producto</Label>
                <SearchSelect value={l.productoId} onValueChange={(v) => elegirProducto(i, v)} placeholder="Producto…" searchPlaceholder="Nombre o SKU…" options={productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})` }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cantidad</Label>
                <Input type="number" min="0" step="0.0001" value={l.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                <Input type="number" min="0" step="0.01" value={l.precioUnitario} onChange={(e) => set(i, { precioUnitario: e.target.value })} />
                {l.productoId && ultimo != null && (
                  <p className="text-[11px] text-muted-foreground">Última venta a este cliente: {money(ultimo)}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <span className="tabular text-sm font-medium">{money(sub)}</span>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))} disabled={lineas.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { productoId: "", cantidad: "", precioUnitario: "" }])}>
          <Plus className="size-4" /> Agregar producto
        </Button>
      </FormSection>

      <Field label="Observaciones">
        <Textarea name="observaciones" rows={2} placeholder="Opcional" />
      </Field>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Guardar />
          <Link href="/cotizaciones" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 sm:max-w-xs">
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular">{money(total)}</span></div>
        </div>
      </div>
    </form>
  );
}
