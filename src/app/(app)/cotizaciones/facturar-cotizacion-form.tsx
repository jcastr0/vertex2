"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { facturarCotizacionAction, type FacturarState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Cuenta { id: number; nombre: string }
interface LineaInicial { productoId: number; nombre: string; cantidad: number; precioUnitario: number }
interface Linea { productoId: number; nombre: string; cantidad: string; precioUnitario: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
];

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Crear factura
    </Button>
  );
}

export function FacturarCotizacionForm({
  cotizacionId,
  numero,
  bodegas,
  cuentas,
  lineasIniciales,
  hoy,
}: {
  cotizacionId: number;
  numero: string;
  bodegas: Opt[];
  cuentas: Cuenta[];
  lineasIniciales: LineaInicial[];
  hoy: string;
}) {
  const action = facturarCotizacionAction.bind(null, cotizacionId);
  const [state, formAction] = useActionState<FacturarState, FormData>(action, {});
  const [tipoVenta, setTipoVenta] = useState("contado");
  const [lineas, setLineas] = useState<Linea[]>(
    lineasIniciales.map((l) => ({ productoId: l.productoId, nombre: l.nombre, cantidad: String(l.cantidad), precioUnitario: String(l.precioUnitario) })),
  );

  const set = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = useMemo(() => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0), [lineas]);
  const lineasJson = JSON.stringify(
    lineas.filter((l) => Number(l.cantidad) > 0).map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario) || 0 })),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="tipoVenta" value={tipoVenta} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title={`Facturar ${numero}`} description="Ajusta cantidades/precios si hace falta, elige bodega y forma de pago.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Bodega (de dónde sale el stock)" required>
            <SearchSelect name="bodegaId" placeholder="Selecciona…" options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))} />
          </Field>
          <Field label="Fecha">
            <DatePicker name="fecha" defaultValue={hoy} />
          </Field>
          <Field label="Tipo de venta">
            <SearchSelect value={tipoVenta} onValueChange={setTipoVenta} options={[{ value: "contado", label: "Contado" }, { value: "credito", label: "Crédito" }]} />
          </Field>
          {tipoVenta === "contado" && (
            <>
              <Field label="Método de pago">
                <SearchSelect name="metodoPago" defaultValue="efectivo" options={METODOS} />
              </Field>
              <Field label="Entra a la cuenta" required>
                <SearchSelect name="cuentaDestinoId" placeholder="Elige la cuenta" options={cuentas.map((c) => ({ value: String(c.id), label: c.nombre }))} />
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Productos" bodyClassName="space-y-3">
        {lineas.map((l, i) => {
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="text-sm font-medium">{l.nombre}</div>
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
      </FormSection>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Confirmar />
          <Link href={`/cotizaciones/${cotizacionId}`} className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 sm:max-w-xs">
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular">{money(total)}</span></div>
        </div>
      </div>
    </form>
  );
}
