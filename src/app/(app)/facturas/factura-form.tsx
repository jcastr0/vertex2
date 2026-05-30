"use client";

import { useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { crearFacturaAction, preciosClienteAction, type FacturaState } from "./actions";
import { Autocomplete, type OpcionAuto } from "@/components/ui/autocomplete";
import { buscarProductos, agregarOIncrementar, precioSugerido, type LineaCarrito } from "@/lib/domain/venta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, ShoppingBag, Trash2 } from "lucide-react";

interface Cliente { id: number; nombre: string }
interface Bodega { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string; unidadBaseId: number; unidadAbrev: string; precio: number }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

// Filtra opciones de Autocomplete reutilizando la lógica de dominio (prefijo>substring).
function filtrarOpciones(opciones: OpcionAuto[], q: string): OpcionAuto[] {
  const buscables = opciones.map((o) => ({ id: Number(o.value), nombre: o.label, sku: o.hint ?? "" }));
  const encontrados = buscarProductos(buscables, q, 8);
  return encontrados.map((b) => opciones.find((o) => Number(o.value) === b.id)!);
}

function Vender() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pending}>
      {pending ? <Loader2 className="size-5 animate-spin" /> : <ShoppingBag className="size-5" />}
      Registrar venta
    </Button>
  );
}

export function FacturaForm({ clientes, bodegas, productos, hoy }: { clientes: Cliente[]; bodegas: Bodega[]; productos: Prod[]; hoy: string }) {
  const [state, action] = useActionState<FacturaState, FormData>(crearFacturaAction, {});
  const [clienteId, setClienteId] = useState("");
  const [bodegaId, setBodegaId] = useState(bodegas[0] ? String(bodegas[0].id) : "");
  const [tipo, setTipo] = useState<"contado" | "credito">("contado");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [preciosCliente, setPreciosCliente] = useState<Record<number, number>>({});
  const [, startTransition] = useTransition();

  const prodPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const base = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p.precio])), [productos]);
  const clienteNombre = useMemo(() => clientes.find((c) => String(c.id) === clienteId)?.nombre ?? "", [clientes, clienteId]);

  const opcionesCliente = useMemo<OpcionAuto[]>(() => clientes.map((c) => ({ value: String(c.id), label: c.nombre })), [clientes]);
  const opcionesProducto = useMemo<OpcionAuto[]>(
    () => productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})`, derecha: money(precioSugerido(p.id, { porCliente: preciosCliente, base })) })),
    [productos, preciosCliente, base],
  );

  function elegirCliente(value: string) {
    setClienteId(value);
    startTransition(async () => setPreciosCliente(await preciosClienteAction(Number(value))));
  }
  function agregarProducto(value: string) {
    const id = Number(value);
    setCarrito((c) => agregarOIncrementar(c, id, precioSugerido(id, { porCliente: preciosCliente, base })));
  }
  function setLinea(id: number, patch: Partial<LineaCarrito>) {
    setCarrito((c) => c.map((l) => (l.productoId === id ? { ...l, ...patch } : l)));
  }
  function quitar(id: number) {
    setCarrito((c) => c.filter((l) => l.productoId !== id));
  }

  const total = useMemo(() => carrito.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0), [carrito]);
  const lineasJson = JSON.stringify(
    carrito
      .filter((l) => l.cantidad > 0)
      .map((l) => {
        const p = prodPorId.get(l.productoId)!;
        return { productoId: l.productoId, unidadId: p.unidadBaseId, cantidad: l.cantidad, precioUnitario: l.precioUnitario };
      }),
  );

  return (
    <form action={action} className="space-y-6 pb-28">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="bodegaId" value={bodegaId} />
      <input type="hidden" name="tipoVenta" value={tipo} />
      <input type="hidden" name="fecha" value={hoy} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label className="text-base">¿A quién le vendes?</Label>
          <Autocomplete opciones={opcionesCliente} onSelect={elegirCliente} filtrar={filtrarOpciones} placeholder={clienteNombre || "Elegir cliente…"} inputClassName="h-12" />
        </div>
        <div className="space-y-2">
          <Label className="text-base">¿Cómo paga?</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["contado", "credito"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} className={cn("h-12 rounded-lg border text-sm font-medium capitalize transition-colors", tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted")}>
                {t === "contado" ? "Contado" : "Crédito"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Bodega</Label>
          <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
            {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base">¿Qué vendes?</Label>
        <Autocomplete opciones={opcionesProducto} onSelect={agregarProducto} filtrar={filtrarOpciones} placeholder="Buscar producto…" limpiarAlSeleccionar inputClassName="h-12" />

        {carrito.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Busca un producto arriba para agregarlo.</p>
        ) : (
          carrito.map((l) => {
            const p = prodPorId.get(l.productoId)!;
            const sub = l.cantidad * l.precioUnitario;
            return (
              <div key={l.productoId} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.nombre}</span>
                  <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => quitar(l.productoId)}><Trash2 className="size-5" /></Button>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cantidad ({p.unidadAbrev})</Label>
                    <Input type="number" min="0" step="0.001" inputMode="decimal" className="h-12 text-center text-lg" value={l.cantidad} onChange={(e) => setLinea(l.productoId, { cantidad: e.target.valueAsNumber || 0 })} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                    <Input type="number" min="0" step="0.01" inputMode="decimal" className="h-12 text-lg" value={l.precioUnitario} onChange={(e) => setLinea(l.productoId, { precioUnitario: e.target.valueAsNumber || 0 })} />
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">Subtotal: <span className="tabular font-medium text-foreground">{money(sub)}</span></div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total a {tipo === "contado" ? "cobrar" : "crédito"}</div>
            <div className="tabular text-2xl font-bold">{money(total)}</div>
          </div>
          <div className="w-44"><Vender /></div>
        </div>
      </div>
    </form>
  );
}
