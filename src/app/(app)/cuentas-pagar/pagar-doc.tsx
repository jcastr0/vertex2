"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { registrarPagoAction, type AbonoState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { calcularRetenciones, type RetencionConfig } from "@/lib/domain/retenciones";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  cxpId: number;
  numero: string;
  saldo: number;
  hoy: string;
  facturaElectronica: boolean;
  cuentasOrigen: { id: number; nombre: string }[];
  retenciones: RetencionConfig[];
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Registrar pago
    </Button>
  );
}

/** Paga UN documento (factura) puntual del proveedor, vía registrarPago. */
export function PagarDoc({ cxpId, numero, saldo, hoy, facturaElectronica, cuentasOrigen, retenciones }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState(saldo);
  const [state, formAction] = useActionState<AbonoState, FormData>(registrarPagoAction, {});

  useEffect(() => {
    if (state.ok) { setOpen(false); router.refresh(); }
  }, [state.ok, router]);

  const ret = useMemo(
    () => calcularRetenciones(Number.isFinite(monto) ? monto : 0, retenciones, facturaElectronica),
    [monto, retenciones, facturaElectronica],
  );
  const neto = Math.max(0, (Number.isFinite(monto) ? monto : 0) - ret.total);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Pagar</Button>
      <Modal open={open} onOpenChange={setOpen} title={`Pagar ${numero}`} description={`Saldo: ${money(saldo)}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="cuentaId" value={cxpId} />
          <input type="hidden" name="destino" value="proveedor" />
          <input type="hidden" name="beneficiariosJson" value="[]" />
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Valor" required>
            <Input name="valor" type="number" min="0" step="0.01" inputMode="decimal" value={Number.isFinite(monto) ? monto : ""} onChange={(e) => setMonto(e.target.valueAsNumber)} required className="h-12 text-lg tabular" autoFocus />
          </Field>
          <Field label="¿De qué cuenta sale?" required>
            <SearchSelect name="cuentaOrigenId" placeholder="Elige la cuenta" options={cuentasOrigen.map((c) => ({ value: String(c.id), label: c.nombre }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="¿Cómo pagaste?" required>
              <SearchSelect name="metodoPago" defaultValue="efectivo" options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))} />
            </Field>
            <Field label="Fecha">
              <DatePicker name="fecha" defaultValue={hoy} />
            </Field>
          </div>
          <Field label="Referencia" hint="Comprobante, cheque, etc.">
            <Input name="referencia" maxLength={100} />
          </Field>
          {facturaElectronica && ret.detalle.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium">Retenciones</p>
              <ul className="space-y-1">
                {ret.detalle.map((d) => (
                  <li key={d.retencionId} className="flex justify-between text-muted-foreground">
                    <span>{d.nombre} ({d.porcentaje}%)</span>
                    <span className="tabular">− {money(d.valor)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                <span>Neto a desembolsar</span><span className="tabular">{money(neto)}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}
