"use client";

import { useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { crearFacturaAction, datosClienteAction, crearClienteRapidoAction, type FacturaState } from "./actions";
import { Autocomplete, type OpcionAuto } from "@/components/ui/autocomplete";
import { buscarProductos, agregarOIncrementar, precioSugerido, sugerirUnidadVenta, type LineaCarrito } from "@/lib/domain/venta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SearchSelect } from "@/components/ui/search-select";
import { Switch } from "@/components/ui/switch";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, ShoppingBag, Trash2, ScanLine, Minus, Plus, Check, Receipt, FileText, UserPlus } from "lucide-react";

interface Cliente { id: number; nombre: string; requiereFE: boolean }
interface Bodega { id: number; nombre: string }
interface ProdUnidad { unidadId: number; abrev: string; factor: number; precio: number | null }
interface Prod { id: number; nombre: string; sku: string; unidadBaseId: number; unidadAbrev: string; precio: number; unidades: ProdUnidad[] }

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

export function FacturaForm({ clientes, bodegas, productos, cuentasDestino, hoy }: { clientes: Cliente[]; bodegas: Bodega[]; productos: Prod[]; cuentasDestino: { id: number; nombre: string }[]; hoy: string }) {
  const [state, action] = useActionState<FacturaState, FormData>(crearFacturaAction, {});
  const [listaClientes, setListaClientes] = useState<Cliente[]>(clientes);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDoc, setNuevoDoc] = useState("");
  const [nuevoError, setNuevoError] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [bodegaId, setBodegaId] = useState(bodegas[0] ? String(bodegas[0].id) : "");
  const [tipo, setTipo] = useState<"contado" | "credito">("contado");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [cuentaDestinoId, setCuentaDestinoId] = useState(cuentasDestino[0] ? String(cuentasDestino[0].id) : "");
  const [esElectronica, setEsElectronica] = useState(false);
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [preciosCliente, setPreciosCliente] = useState<Record<number, number>>({});
  /** Última unidad vendida por producto al cliente seleccionado: productoId → { unidadId, precio } */
  const [unidadesCliente, setUnidadesCliente] = useState<Record<number, { unidadId: number; precio: number }>>({});
  const [, startTransition] = useTransition();

  const prodPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const base = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p.precio])), [productos]);
  const clienteNombre = useMemo(() => listaClientes.find((c) => String(c.id) === clienteId)?.nombre ?? "", [listaClientes, clienteId]);

  /** Map productoId → unidadId a partir de la última venta al cliente */
  const unidadUltimaPorProducto = useMemo<Record<number, number>>(
    () => Object.fromEntries(Object.entries(unidadesCliente).map(([pid, v]) => [Number(pid), v.unidadId])),
    [unidadesCliente],
  );

  const opcionesCliente = useMemo<OpcionAuto[]>(() => listaClientes.map((c) => ({ value: String(c.id), label: c.nombre })), [listaClientes]);
  const opcionesProducto = useMemo<OpcionAuto[]>(
    () => productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})`, derecha: money(precioSugerido(p.id, { porCliente: preciosCliente, base })) })),
    [productos, preciosCliente, base],
  );

  function elegirCliente(value: string) {
    setClienteId(value);
    // La factura hereda el flag del cliente; el usuario puede cambiarlo abajo.
    const cli = listaClientes.find((c) => String(c.id) === value);
    setEsElectronica(cli?.requiereFE ?? false);
    startTransition(async () => {
      const datos = await datosClienteAction(Number(value));
      setPreciosCliente(datos.precios);
      setUnidadesCliente(datos.unidades);
    });
  }

  async function crearClienteRapido() {
    setNuevoError("");
    setCreandoCliente(true);
    try {
      const res = await crearClienteRapidoAction(nuevoNombre, nuevoDoc);
      if (!res.ok) { setNuevoError(res.error); return; }
      const nuevo: Cliente = { id: res.id, nombre: res.nombre, requiereFE: res.requiereFE };
      setListaClientes((cs) => [nuevo, ...cs]);
      setNuevoOpen(false);
      setNuevoNombre("");
      setNuevoDoc("");
      elegirCliente(String(res.id));
    } finally {
      setCreandoCliente(false);
    }
  }

  /** Resuelve precio para una unidad concreta: usa el último precio del cliente si la unidad coincide, luego el precio de la presentación, luego el base. */
  function precioParaUnidad(prod: Prod, unidadId: number): number {
    const clienteInfo = unidadesCliente[prod.id];
    if (clienteInfo && clienteInfo.unidadId === unidadId) return clienteInfo.precio;
    const pu = prod.unidades.find((u) => u.unidadId === unidadId);
    if (pu && pu.precio !== null) return pu.precio;
    return precioSugerido(prod.id, { porCliente: preciosCliente, base });
  }

  function agregarProducto(value: string) {
    const id = Number(value);
    const prod = prodPorId.get(id);
    if (!prod) return;
    const unidadId = sugerirUnidadVenta(id, unidadUltimaPorProducto, prod.unidadBaseId);
    const precio = precioParaUnidad(prod, unidadId);
    setCarrito((c) => {
      const nuevo = agregarOIncrementar(c, id, precio);
      // Si el producto es nuevo (unidadId=0 en la última línea), establecer la unidad correcta
      return nuevo.map((l) => (l.productoId === id && l.unidadId === 0 ? { ...l, unidadId, precioUnitario: precio } : l));
    });
  }

  function setLinea(id: number, patch: Partial<LineaCarrito>) {
    setCarrito((c) => c.map((l) => (l.productoId === id ? { ...l, ...patch } : l)));
  }

  function cambiarUnidad(productoId: number, nuevaUnidadId: number) {
    const prod = prodPorId.get(productoId);
    if (!prod) return;
    const precio = precioParaUnidad(prod, nuevaUnidadId);
    setCarrito((c) => c.map((l) => (l.productoId === productoId ? { ...l, unidadId: nuevaUnidadId, precioUnitario: precio } : l)));
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
        const prod = prodPorId.get(l.productoId)!;
        // Usar la unidad del carrito; si aún es 0 (no debería), caer a la base.
        const unidadId = l.unidadId || prod.unidadBaseId;
        return { productoId: l.productoId, unidadId, cantidad: l.cantidad, precioUnitario: l.precioUnitario };
      }),
  );

  return (
    <form action={action} className="pb-24 md:pb-0">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="bodegaId" value={bodegaId} />
      <input type="hidden" name="tipoVenta" value={tipo} />
      <input type="hidden" name="metodoPago" value={metodoPago} />
      <input type="hidden" name="cuentaDestinoId" value={cuentaDestinoId} />
      <input type="hidden" name="esElectronica" value={esElectronica ? "1" : ""} />
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
                  onClick={() => { setClienteId(""); setPreciosCliente({}); setUnidadesCliente({}); setEsElectronica(false); }}
                  className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10"
                >
                  <Check className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate font-medium">{clienteNombre}</span>
                  <span className="text-xs text-muted-foreground">Cambiar</span>
                </button>
              ) : (
                <>
                  <Autocomplete opciones={opcionesCliente} onSelect={elegirCliente} filtrar={filtrarOpciones} placeholder="Elegir cliente…" inputClassName="h-11" />
                  <button
                    type="button"
                    onClick={() => setNuevoOpen(true)}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <UserPlus className="size-4" /> Cliente nuevo
                  </button>
                </>
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

            {tipo === "contado" && (
              <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">¿Cómo te pagó?</Label>
                  <SearchSelect name="metodoPagoUI" defaultValue="efectivo" onValueChange={setMetodoPago} options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">¿A dónde entró?</Label>
                  <SearchSelect
                    name="cuentaDestinoUI"
                    placeholder="Elige la cuenta"
                    defaultValue={cuentaDestinoId || undefined}
                    onValueChange={setCuentaDestinoId}
                    options={cuentasDestino.map((c) => ({ value: String(c.id), label: c.nombre }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Bodega</Label>
              <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm">
                {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>

            <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors", esElectronica ? "border-primary/40 bg-primary/5" : "border-border")}>
              <FileText className={cn("size-4 shrink-0", esElectronica ? "text-primary" : "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Factura electrónica</p>
                <p className="text-xs text-muted-foreground">{esElectronica ? "Se exportará para el contador" : "Venta normal"}</p>
              </div>
              <Switch checked={esElectronica} onCheckedChange={setEsElectronica} />
            </label>
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
                const opcionesUnidad = p.unidades.map((u) => ({ value: String(u.unidadId), label: u.abrev }));
                const tieneVariasUnidades = p.unidades.length > 1;
                return (
                  <li key={l.productoId} className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                        {/* Badge / selector de unidad */}
                        {tieneVariasUnidades ? (
                          <SearchSelect
                            value={String(l.unidadId)}
                            onValueChange={(v) => cambiarUnidad(l.productoId, Number(v))}
                            options={opcionesUnidad}
                            searchThreshold={999}
                            triggerClassName="h-6 min-w-[3.5rem] max-w-[6rem] rounded-full border-primary/40 bg-primary/10 px-2 text-xs font-semibold text-primary hover:bg-primary/20 [&>svg]:size-3"
                          />
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {p.unidades[0]?.abrev ?? p.unidadAbrev}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
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

      <Modal open={nuevoOpen} onOpenChange={setNuevoOpen} title="Cliente nuevo" description="Lo mínimo para vender ya; luego puedes completar sus datos.">
        <div className="space-y-4">
          {nuevoError && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {nuevoError}
            </div>
          )}
          <Field label="Nombre" required>
            <Input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} maxLength={200} autoFocus placeholder="Ej. Tienda Doña Mary" />
          </Field>
          <Field label="Documento / NIT" hint="Opcional — puedes dejarlo en blanco">
            <Input value={nuevoDoc} onChange={(e) => setNuevoDoc(e.target.value)} maxLength={50} placeholder="Sin documento" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={crearClienteRapido} disabled={creandoCliente}>
              {creandoCliente ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Crear y elegir
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
