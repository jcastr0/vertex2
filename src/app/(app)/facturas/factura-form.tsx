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
import { AlertCircle, Loader2, ShoppingBag, Trash2, ScanLine, Minus, Plus, Check, Receipt } from "lucide-react";

interface Cliente { id: number; nombre: string }
interface Bodega { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string; unidadBaseId: number; unidadAbrev: string; precio: number }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function filtrarOpciones(opciones: OpcionAuto[], q: string): OpcionAuto[] {
  const buscables = opciones.map((o) => ({ id: Number(o.value), nombre: o.label, sku: o.hint ?? "" }));
  return buscarProductos(buscables, q, 8).map((b) => opciones.find((o) => Number(o.value) === b.id)!);
}

function Vender({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className={cn("h-12 w-full text-base", className)}>
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
  function sumar(id: number, delta: number) {
    setCarrito((c) => c.map((l) => (l.productoId === id ? { ...l, cantidad: Math.max(0, +(l.cantidad + delta).toFixed(3)) } : l)));
  }
  function quitar(id: number) {
    setCarrito((c) => c.filter((l) => l.productoId !== id));
  }

  const total = useMemo(() => carrito.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0), [carrito]);
  const numItems = carrito.length;
  const lineasJson = JSON.stringify(
    carrito
      .filter((l) => l.cantidad > 0)
      .map((l) => {
        const p = prodPorId.get(l.productoId)!;
        return { productoId: l.productoId, unidadId: p.unidadBaseId, cantidad: l.cantidad, precioUnitario: l.precioUnitario };
      }),
  );

  return (
    <form action={action} className="pb-24 md:pb-0">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="bodegaId" value={bodegaId} />
      <input type="hidden" name="tipoVenta" value={tipo} />
      <input type="hidden" name="fecha" value={hoy} />

      {state.error && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,360px)_1fr]">
        {/* ── Columna izquierda: control ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-medium">¿A quién le vendes?</Label>
              {clienteNombre ? (
                <button
                  type="button"
                  onClick={() => { setClienteId(""); setPreciosCliente({}); }}
                  className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10"
                >
                  <Check className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate font-medium">{clienteNombre}</span>
                  <span className="text-xs text-muted-foreground">Cambiar</span>
                </button>
              ) : (
                <Autocomplete opciones={opcionesCliente} onSelect={elegirCliente} filtrar={filtrarOpciones} placeholder="Elegir cliente…" inputClassName="h-11" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">¿Cómo paga?</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(["contado", "credito"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTipo(t)} className={cn("h-10 rounded-md text-sm font-medium capitalize transition-all", tipo === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {t === "contado" ? "Contado" : "Crédito"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Bodega</Label>
              <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm">
                {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Label className="mb-2 flex items-center gap-2 text-sm font-medium"><ScanLine className="size-4 text-primary" /> Agregar producto</Label>
            <Autocomplete opciones={opcionesProducto} onSelect={agregarProducto} filtrar={filtrarOpciones} placeholder="Buscar por nombre o SKU…" limpiarAlSeleccionar inputClassName="h-11" autoFocus />
            <p className="mt-2 text-xs text-muted-foreground">Se agrega a la cuenta. Si lo buscas de nuevo, suma cantidad.</p>
          </div>
        </div>

        {/* ── Columna derecha: la cuenta (ticket) ── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-3.5">
            <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Receipt className="size-4 text-primary" /> La cuenta</h2>
            {numItems > 0 && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{numItems} producto{numItems !== 1 ? "s" : ""}</span>}
          </div>

          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted"><ShoppingBag className="size-6 text-muted-foreground/50" /></span>
              <p className="text-sm font-medium">La cuenta está vacía</p>
              <p className="text-sm text-muted-foreground">Busca productos a la izquierda para agregarlos.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {carrito.map((l) => {
                const p = prodPorId.get(l.productoId)!;
                const sub = l.cantidad * l.precioUnitario;
                return (
                  <li key={l.productoId} className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.unidadAbrev}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* stepper de cantidad */}
                      <div className="flex h-10 items-center rounded-lg border border-border bg-background">
                        <button type="button" onClick={() => sumar(l.productoId, -1)} className="flex size-9 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Restar uno"><Minus className="size-3.5" /></button>
                        <input
                          type="number" min="0" step="0.001" inputMode="decimal"
                          aria-label={`Cantidad de ${p.nombre}`}
                          className="h-full w-14 border-x border-border bg-transparent text-center text-sm tabular outline-none focus:bg-muted/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          value={l.cantidad}
                          onChange={(e) => setLinea(l.productoId, { cantidad: e.target.valueAsNumber || 0 })}
                        />
                        <button type="button" onClick={() => sumar(l.productoId, 1)} className="flex size-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Sumar uno"><Plus className="size-3.5" /></button>
                      </div>
                      <span className="text-xs text-muted-foreground">×</span>
                      {/* precio editable */}
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          type="number" min="0" step="0.01" inputMode="decimal"
                          aria-label={`Precio de ${p.nombre}`}
                          className="h-10 pl-6 text-right tabular"
                          value={l.precioUnitario}
                          onChange={(e) => setLinea(l.productoId, { precioUnitario: e.target.valueAsNumber || 0 })}
                        />
                      </div>
                      <span className="ml-auto w-24 shrink-0 text-right tabular text-sm font-semibold sm:ml-0">{money(sub)}</span>
                      <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => quitar(l.productoId)} aria-label={`Quitar ${p.nombre}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* footer del ticket (desktop): total + CTA */}
          {carrito.length > 0 && (
            <div className="hidden border-t border-border bg-muted/20 px-5 py-4 md:block">
              <div className="mb-3 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">Total a {tipo === "contado" ? "cobrar" : "crédito"}</span>
                <span className="tabular text-3xl font-bold tracking-tight">{money(total)}</span>
              </div>
              <Vender />
            </div>
          )}
        </div>
      </div>

      {/* barra fija (solo móvil) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total · {numItems} prod.</div>
            <div className="tabular text-xl font-bold">{money(total)}</div>
          </div>
          <div className="w-40"><Vender /></div>
        </div>
      </div>
    </form>
  );
}
