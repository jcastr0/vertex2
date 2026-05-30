"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { registrarMovimientoAction, type MovimientoState } from "./actions";
import { AlertCircle, Loader2 } from "lucide-react";

interface Opcion { id: number; nombre: string }
interface Props { cuentaId: number; hoy: string; otrasCuentas: Opcion[] }

const ORIGENES = [
  { value: "consignacion", label: "Consignación (entrada)" },
  { value: "retiro", label: "Retiro (salida)" },
  { value: "comision", label: "Comisión bancaria (salida)" },
  { value: "traslado", label: "Traslado a otra cuenta (salida)" },
  { value: "ajuste", label: "Ajuste (entrada)" },
];

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Registrar
    </Button>
  );
}

export function MovimientoButton({ cuentaId, hoy, otrasCuentas }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [origen, setOrigen] = useState("consignacion");
  const [state, action] = useActionState<MovimientoState, FormData>(registrarMovimientoAction, {});

  useEffect(() => {
    if (state.ok) { setOpen(false); router.refresh(); }
  }, [state.ok, router]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Nuevo movimiento</Button>
      <Modal open={open} onOpenChange={setOpen} title="Nuevo movimiento" description="Registra una entrada, salida o traslado.">
        <form action={action} className="space-y-4">
          <input type="hidden" name="cuentaPropiaId" value={cuentaId} />
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Tipo de movimiento" required>
            <SearchSelect name="origen" defaultValue="consignacion" options={ORIGENES} onValueChange={setOrigen} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" required>
              <Input name="valor" type="number" min="0" step="0.01" required />
            </Field>
            <Field label="Fecha">
              <DatePicker name="fecha" defaultValue={hoy} />
            </Field>
          </div>
          {origen === "traslado" && (
            <Field label="Cuenta destino" required>
              <SearchSelect
                name="contraCuentaId"
                placeholder="Elige la cuenta destino"
                options={otrasCuentas.map((c) => ({ value: String(c.id), label: c.nombre }))}
              />
            </Field>
          )}
          <Field label="Descripción">
            <Input name="descripcion" maxLength={500} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}
