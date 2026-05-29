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
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { AlertCircle, Loader2 } from "lucide-react";

interface State {
  error?: string;
  ok?: boolean;
}

function Confirmar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

interface Props {
  cuentaId: number;
  saldo: number;
  hoy: string;
  triggerLabel: string;
  modalTitulo: string;
  confirmarLabel: string;
  action: (prev: State, form: FormData) => Promise<State>;
}

export function AbonoButton({ cuentaId, saldo, hoy, triggerLabel, modalTitulo, confirmarLabel, action }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<State, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={modalTitulo} description={`Saldo pendiente: $${saldo.toLocaleString("es-CO")}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="cuentaId" value={cuentaId} />
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" required>
              <Input name="valor" type="number" min="0" step="0.01" defaultValue={saldo} required />
            </Field>
            <Field label="Método de pago" required>
              <SearchSelect name="metodoPago" defaultValue="efectivo" options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))} />
            </Field>
            <Field label="Fecha">
              <DatePicker name="fecha" defaultValue={hoy} />
            </Field>
            <Field label="Referencia" hint="N° de comprobante, cheque, etc.">
              <Input name="referencia" maxLength={100} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar label={confirmarLabel} />
          </div>
        </form>
      </Modal>
    </>
  );
}
