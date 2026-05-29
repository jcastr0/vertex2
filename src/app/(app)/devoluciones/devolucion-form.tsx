"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearDevolucionAction, type DevolucionState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string }
interface Fact { id: number; numero: string; clienteId: number }
interface Linea { productoId: string; cantidad: string; precioUnitario: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Procesar devolución
    </Button>
  );
}

export function DevolucionForm({
  clientes,
  bodegas,
  productos,
  facturas,
  hoy,
}: {
  clientes: Opt[];
  bodegas: Opt[];
  productos: Prod[];
  facturas: Fact[];
  hoy: string;
}) {
  const [state, action] = useActionState<DevolucionState, FormData>(crearDevolucionAction, {});
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ productoId: "", cantidad: "", precioUnitario: "" }]);

  const total = useMemo(
    () => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0),
    [lineas],
  );
  const facturasCliente = facturas.filter((f) => String(f.clienteId) === clienteId);

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.productoId && Number(l.cantidad) > 0)
      .map((l) => ({ productoId: Number(l.productoId), cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario) || 0 })),
  );
  const set = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <form action={action} className="max-w-3xl space-y-6">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Cliente" required>
          <SearchSelect value={clienteId} onValueChange={setClienteId} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
        </Field>
        <Field label="Factura (opcional)" hint="Reduce su cuenta por cobrar.">
          <SearchSelect name="facturaId" placeholder="Sin factura" options={facturasCliente.map((f) => ({ value: String(f.id), label: f.numero }))} />
        </Field>
        <Field label="Bodega de reingreso" required>
          <SearchSelect name="bodegaId" placeholder="Selecciona…" options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))} />
        </Field>
      </div>

      <Field label="Fecha">
        <DatePicker name="fecha" defaultValue={hoy} />
      </Field>

      <div className="space-y-3">
        <Label>Productos devueltos</Label>
        {lineas.map((l, i) => {
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Producto</Label>
                <SearchSelect value={l.productoId} onValueChange={(v) => set(i, { productoId: v })} placeholder="Producto…" searchPlaceholder="Nombre o SKU…" options={productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})` }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cantidad</Label>
                <Input type="number" min="0" step="0.0001" value={l.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                <Input type="number" min="0" step="0.01" value={l.precioUnitario} onChange={(e) => set(i, { precioUnitario: e.target.value })} />
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
      </div>

      <Field label="Motivo" required>
        <Textarea name="motivo" rows={2} required />
      </Field>

      <div className="rounded-lg border border-border bg-muted/30 p-4 sm:ml-auto sm:max-w-xs">
        <div className="flex justify-between font-semibold"><span>Total nota crédito</span><span className="tabular">{money(total)}</span></div>
      </div>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/devoluciones" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
