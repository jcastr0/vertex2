"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { registrarFacturaProveedorAction, type FacturaProvState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { AlertCircle, Loader2, FileText } from "lucide-react";

interface Props {
  cxpId: number;
  /** Número provisional (el del pedido) para mostrar de referencia. */
  numeroSugerido?: string;
  vencimientoSugerido: string;
  hoy: string;
  /** Default del switch electrónica (del flag del proveedor). */
  feSugerida?: boolean;
  /** Texto del botón disparador. */
  triggerLabel?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
}

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Guardar factura
    </Button>
  );
}

/** Captura la factura del proveedor (número real + electrónica sí/no) sobre una CxP. */
export function RegistrarFacturaProveedor({ cxpId, numeroSugerido, vencimientoSugerido, hoy, feSugerida = false, triggerLabel = "Registrar factura", variant = "outline", size = "sm" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [esElectronica, setEsElectronica] = useState(feSugerida);
  const action = registrarFacturaProveedorAction.bind(null, cxpId);
  const [state, formAction] = useActionState<FacturaProvState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) { setOpen(false); router.refresh(); }
  }, [state.ok, router]);

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        <FileText className="size-4" /> {triggerLabel}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Factura del proveedor" description="Lo que te facturó el proveedor. Define si te la cobra electrónica.">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="esElectronica" value={esElectronica ? "1" : ""} />
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="N° de factura del proveedor" required>
            <Input name="numeroFactura" maxLength={50} required autoFocus defaultValue={numeroSugerido} placeholder="Ej. FE-1234 o 0098" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha de la factura" required>
              <DatePicker name="fechaFactura" defaultValue={hoy} />
            </Field>
            <Field label="Vence" required>
              <DatePicker name="fechaVencimiento" defaultValue={vencimientoSugerido} />
            </Field>
          </div>
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${esElectronica ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            <FileText className={`size-4 shrink-0 ${esElectronica ? "text-primary" : "text-muted-foreground"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Factura electrónica</p>
              <p className="text-xs text-muted-foreground">{esElectronica ? "Aplica retenciones y va al export del contador" : "Compra normal (sin retención)"}</p>
            </div>
            <Switch checked={esElectronica} onCheckedChange={setEsElectronica} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Guardar />
          </div>
        </form>
      </Modal>
    </>
  );
}
