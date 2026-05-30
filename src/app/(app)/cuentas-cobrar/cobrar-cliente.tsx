"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { cobrarClienteAction, type AbonoState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { AlertCircle, Loader2, ChevronRight } from "lucide-react";

interface Props {
  clienteId: number;
  cliente: string;
  total: number;
  vencido: boolean;
  hoy: string;
  cuentasDestino: { id: number; nombre: string }[];
}

const money = (n: number) => "$" + n.toLocaleString("es-CO");

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 flex-1 text-base">
      {pending ? <Loader2 className="size-5 animate-spin" /> : null}
      Listo
    </Button>
  );
}

export function CobrarCliente({ clienteId, cliente, total, vencido, hoy, cuentasDestino }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = cobrarClienteAction.bind(null, clienteId);
  const [state, formAction] = useActionState<AbonoState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
      >
        <span className={`size-2.5 shrink-0 rounded-full ${vencido ? "bg-destructive" : "bg-primary/40"}`} title={vencido ? "Vencido" : "Al día"} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{cliente}</p>
          <p className="text-sm text-muted-foreground">Te debe</p>
        </div>
        <span className="tabular text-lg font-bold tracking-tight">{money(total)}</span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </button>

      <Modal open={open} onOpenChange={setOpen} title={`¿Cuánto te pagó ${cliente}?`} description={`Te debe ${money(total)}`}>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Monto" required>
            <Input name="monto" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={total} required className="h-12 text-lg tabular" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="¿Cómo pagó?" required>
              <SearchSelect name="metodoPago" defaultValue="efectivo" options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))} />
            </Field>
            <Field label="¿A dónde entró?" required>
              <SearchSelect name="cuentaDestinoId" placeholder="Elige la cuenta" options={cuentasDestino.map((c) => ({ value: String(c.id), label: c.nombre }))} />
            </Field>
          </div>
          <Field label="Fecha">
            <DatePicker name="fecha" defaultValue={hoy} />
          </Field>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="h-12" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}
