"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearFacturaAction, type FacturaState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Plus, ShoppingBag, Trash2 } from "lucide-react";

interface Cliente { id: number; nombre: string }
interface Bodega { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string; unidadBaseId: number; unidadAbrev: string; precio: number }
interface Linea { productoId: string; cantidad: string; precioUnitario: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function Vender() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pending}>
      {pending ? <Loader2 className="size-5 animate-spin" /> : <ShoppingBag className="size-5" />}
      Registrar venta
    </Button>
  );
}

export function FacturaForm({
  clientes,
  bodegas,
  productos,
  hoy,
}: {
  clientes: Cliente[];
  bodegas: Bodega[];
  productos: Prod[];
  hoy: string;
}) {
  const [state, action] = useActionState<FacturaState, FormData>(crearFacturaAction, {});
  const [tipo, setTipo] = useState<"contado" | "credito">("contado");
  const [lineas, setLineas] = useState<Linea[]>([{ productoId: "", cantidad: "1", precioUnitario: "" }]);
  const prodPorId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);

  const total = useMemo(
    () => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0),
    [lineas],
  );

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.productoId && Number(l.cantidad) > 0)
      .map((l) => {
        const p = prodPorId.get(l.productoId)!;
        return {
          productoId: Number(l.productoId),
          unidadId: p.unidadBaseId,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precioUnitario) || 0,
        };
      }),
  );

  function elegirProducto(i: number, productoId: string) {
    const p = prodPorId.get(productoId);
    setLineas((ls) =>
      ls.map((l, idx) =>
        idx === i ? { ...l, productoId, precioUnitario: p ? String(p.precio) : l.precioUnitario } : l,
      ),
    );
  }
  function setLinea(i: number, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="space-y-6 pb-28">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="tipoVenta" value={tipo} />
      <input type="hidden" name="fecha" value={hoy} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      {/* Cliente + tipo */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label className="text-base">¿A quién le vendes?</Label>
          <Select name="clienteId">
            <SelectTrigger className="h-12"><SelectValue placeholder="Elegir cliente…" /></SelectTrigger>
            <SelectContent>
              {clientes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base">¿Cómo paga?</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["contado", "credito"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "h-12 rounded-lg border text-sm font-medium capitalize transition-colors",
                  tipo === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {t === "contado" ? "Contado" : "Crédito"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Bodega</Label>
          <Select name="bodegaId" defaultValue={bodegas[0] ? String(bodegas[0].id) : undefined}>
            <SelectTrigger><SelectValue placeholder="Bodega…" /></SelectTrigger>
            <SelectContent>
              {bodegas.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Productos */}
      <div className="space-y-3">
        <Label className="text-base">¿Qué vendes?</Label>
        {lineas.map((l, i) => {
          const p = prodPorId.get(l.productoId);
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <Select value={l.productoId} onValueChange={(v) => elegirProducto(i, v ?? "")}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Buscar producto…" /></SelectTrigger>
                <SelectContent>
                  {productos.map((pr) => (
                    <SelectItem key={pr.id} value={String(pr.id)}>{pr.nombre} <span className="text-muted-foreground">({pr.sku})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cantidad {p ? `(${p.unidadAbrev})` : ""}</Label>
                  <Input type="number" min="0" step="0.0001" inputMode="decimal" className="h-12 text-center text-lg" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                  <Input type="number" min="0" step="0.01" inputMode="decimal" className="h-12 text-lg" value={l.precioUnitario} onChange={(e) => setLinea(i, { precioUnitario: e.target.value })} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="size-12 text-destructive" onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))} disabled={lineas.length === 1}>
                  <Trash2 className="size-5" />
                </Button>
              </div>
              <div className="text-right text-sm text-muted-foreground">Subtotal: <span className="tabular font-medium text-foreground">{money(sub)}</span></div>
            </div>
          );
        })}
        <Button type="button" variant="outline" className="h-12 w-full" onClick={() => setLineas((ls) => [...ls, { productoId: "", cantidad: "1", precioUnitario: "" }])}>
          <Plus className="size-4" /> Agregar otro producto
        </Button>
      </div>

      {/* Barra de total fija */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total a {tipo === "contado" ? "cobrar" : "crédito"}</div>
            <div className="tabular text-2xl font-bold">{money(total)}</div>
          </div>
          <div className="w-44">
            <Vender />
          </div>
        </div>
      </div>

      <div className="hidden">
        <Link href="/facturas" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
