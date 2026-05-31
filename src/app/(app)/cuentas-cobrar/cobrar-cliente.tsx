"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { cobrarClienteAction, registrarRecaudoAction, type AbonoState } from "./actions";
import { AbonoButton } from "@/components/abono-button";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { AlertCircle, Loader2, ChevronDown, HandCoins } from "lucide-react";

interface Doc { id: number; numero: string; fecha: string; vence: string; total: number; saldo: number }
interface Props {
  clienteId: number;
  cliente: string;
  total: number;
  vencido: boolean;
  hoy: string;
  cuentasDestino: { id: number; nombre: string }[];
  docs: Doc[];
}

const money = (n: number) => "$" + n.toLocaleString("es-CO");
const fmtFecha = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 flex-1 text-base">
      {pending ? <Loader2 className="size-5 animate-spin" /> : null}
      Listo
    </Button>
  );
}

export function CobrarCliente({ clienteId, cliente, total, vencido, hoy, cuentasDestino, docs }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [abierto, setAbierto] = useState(false);
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40">
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className={`size-2.5 shrink-0 rounded-full ${vencido ? "bg-destructive" : "bg-primary/40"}`} title={vencido ? "Vencido" : "Al día"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{cliente}</span>
              <span className="text-sm text-muted-foreground">{docs.length} {docs.length === 1 ? "factura" : "facturas"}{vencido ? " · tiene vencido" : ""}</span>
            </span>
            <span className="tabular text-lg font-bold tracking-tight">{money(total)}</span>
            <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`} />
          </button>
          <Button type="button" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            <HandCoins className="size-4" /> Cobrar
          </Button>
        </div>

        {abierto && docs.length > 0 && (
          <ul className="divide-y divide-border border-t border-border bg-muted/20 text-sm">
            {docs.map((d) => {
              const venc = d.vence < hoy;
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{d.numero}</span>
                    <span className="text-muted-foreground"> · {fmtFecha(d.fecha)}</span>
                  </span>
                  <span className={`hidden shrink-0 text-xs sm:inline ${venc ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                    vence {fmtFecha(d.vence)}
                  </span>
                  <span className="tabular w-20 shrink-0 text-right font-medium sm:w-24">{money(d.saldo)}</span>
                  <AbonoButton
                    cuentaId={d.id}
                    saldo={d.saldo}
                    hoy={hoy}
                    triggerLabel="Cobrar"
                    modalTitulo={`Cobrar ${d.numero}`}
                    confirmarLabel="Registrar cobro"
                    action={registrarRecaudoAction}
                    cuentasDestino={cuentasDestino}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
