"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearPedidoAction, type PedidoState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string }
interface Und { id: number; nombre: string; abreviatura: string }
interface Linea { productoId: string; unidadId: string; cantidad: string; precioUnitario: string }
interface Costo { tipo: string; valor: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Crear pedido
    </Button>
  );
}

export function PedidoForm({
  proveedores,
  bodegas,
  productos,
  unidades,
  hoy,
}: {
  proveedores: Opt[];
  bodegas: Opt[];
  productos: Prod[];
  unidades: Und[];
  hoy: string;
}) {
  const [state, action] = useActionState<PedidoState, FormData>(crearPedidoAction, {});
  const [lineas, setLineas] = useState<Linea[]>([
    { productoId: "", unidadId: "", cantidad: "", precioUnitario: "" },
  ]);
  const [costos, setCostos] = useState<Costo[]>([]);

  const subtotal = useMemo(
    () => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0),
    [lineas],
  );
  const costosTotal = useMemo(() => costos.reduce((a, c) => a + (Number(c.valor) || 0), 0), [costos]);
  const total = subtotal + costosTotal;

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.productoId && l.unidadId && l.cantidad)
      .map((l) => ({
        productoId: Number(l.productoId),
        unidadId: Number(l.unidadId),
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario) || 0,
      })),
  );
  const costosJson = JSON.stringify(
    costos.filter((c) => c.tipo && c.valor).map((c) => ({ tipo: c.tipo, valor: Number(c.valor) })),
  );

  function setLinea(i: number, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="costosJson" value={costosJson} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Proveedor</Label>
          <Select name="proveedorId">
            <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
            <SelectContent>
              {proveedores.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Bodega destino</Label>
          <Select name="bodegaId">
            <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
            <SelectContent>
              {bodegas.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fecha</Label>
          <Input type="date" name="fecha" defaultValue={hoy} required />
        </div>
      </div>

      {/* Líneas */}
      <div className="space-y-3">
        <Label>Productos</Label>
        {lineas.map((l, i) => {
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Producto</Label>
                <Select value={l.productoId} onValueChange={(v) => setLinea(i, { productoId: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Producto…" /></SelectTrigger>
                  <SelectContent>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nombre} <span className="text-muted-foreground">({p.sku})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Unidad</Label>
                <Select value={l.unidadId} onValueChange={(v) => setLinea(i, { unidadId: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Unidad…" /></SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.abreviatura}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cantidad</Label>
                <Input type="number" min="0" step="0.0001" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Precio unit.</Label>
                <Input type="number" min="0" step="0.01" value={l.precioUnitario} onChange={(e) => setLinea(i, { precioUnitario: e.target.value })} />
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
        <Button type="button" variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { productoId: "", unidadId: "", cantidad: "", precioUnitario: "" }])}>
          <Plus className="size-4" /> Agregar producto
        </Button>
      </div>

      {/* Costos adicionales */}
      <div className="space-y-3">
        <Label>Costos adicionales (flete, etc.)</Label>
        {costos.map((c, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <Input placeholder="Concepto (flete, gasolina…)" value={c.tipo} onChange={(e) => setCostos((cs) => cs.map((x, idx) => idx === i ? { ...x, tipo: e.target.value } : x))} />
            <Input type="number" min="0" step="0.01" placeholder="Valor" value={c.valor} onChange={(e) => setCostos((cs) => cs.map((x, idx) => idx === i ? { ...x, valor: e.target.value } : x))} />
            <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setCostos((cs) => cs.filter((_, idx) => idx !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setCostos((cs) => [...cs, { tipo: "", valor: "" }])}>
          <Plus className="size-4" /> Agregar costo
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Textarea name="observaciones" rows={2} />
      </div>

      {/* Totales */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 sm:ml-auto sm:max-w-xs">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{money(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Costos adic.</span><span className="tabular">{money(costosTotal)}</span></div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="tabular">{money(total)}</span></div>
      </div>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/pedidos" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
