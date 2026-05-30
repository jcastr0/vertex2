"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearTrasladoAction, type TrasladoState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string }
interface Linea { productoId: string; cantidad: string }

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Crear traslado
    </Button>
  );
}

export function TrasladoForm({ bodegas, productos, hoy }: { bodegas: Opt[]; productos: Prod[]; hoy: string }) {
  const [state, action] = useActionState<TrasladoState, FormData>(crearTrasladoAction, {});
  const [lineas, setLineas] = useState<Linea[]>([{ productoId: "", cantidad: "" }]);

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.productoId && Number(l.cantidad) > 0)
      .map((l) => ({ productoId: Number(l.productoId), cantidad: Number(l.cantidad) })),
  );

  const set = (i: number, patch: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="lineasJson" value={lineasJson} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title="Datos del traslado" description="Bodegas involucradas, fecha y observaciones.">
        <div className="space-y-5">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <Field label="Bodega origen" required>
              <SearchSelect name="bodegaOrigenId" placeholder="Origen…" options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))} />
            </Field>
            <ArrowRight className="mb-2.5 hidden size-4 text-muted-foreground sm:block" />
            <Field label="Bodega destino" required>
              <SearchSelect name="bodegaDestinoId" placeholder="Destino…" options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Fecha">
              <DatePicker name="fecha" defaultValue={hoy} />
            </Field>
          </div>
          <Field label="Observaciones">
            <Textarea name="observaciones" rows={2} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Productos"
        description="Artículos que se van a trasladar y sus cantidades."
        bodyClassName="space-y-3"
      >
        {lineas.map((l, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Producto</Label>
              <SearchSelect
                value={l.productoId}
                onValueChange={(v) => set(i, { productoId: v })}
                placeholder="Producto…"
                searchPlaceholder="Nombre o SKU…"
                options={productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})` }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cantidad</Label>
              <Input type="number" min="0" step="0.0001" value={l.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))} disabled={lineas.length === 1}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { productoId: "", cantidad: "" }])}>
          <Plus className="size-4" /> Agregar producto
        </Button>
      </FormSection>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/traslados" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
