"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { interpretarPedidoAction, confirmarPedidoAction, type InterpretarState, type ConfirmarState } from "./asistente-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

interface Opt { id: number; nombre: string }
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function BtnInterpretar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Interpretar pedido
    </Button>
  );
}
function BtnConfirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Confirmar y crear cotización
    </Button>
  );
}

export function AsistenteForm({ clientes }: { clientes: Opt[] }) {
  const [state, action] = useActionState<InterpretarState, FormData>(interpretarPedidoAction, {});
  const [confState, confAction] = useActionState<ConfirmarState, FormData>(confirmarPedidoAction, {});
  const [clienteId, setClienteId] = useState("");
  const [imagenDataUrl, setImagenDataUrl] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { setImagenDataUrl(""); return; }
    const reader = new FileReader();
    reader.onload = () => setImagenDataUrl(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  const p = state.propuesta;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="imagenDataUrl" value={imagenDataUrl} />
        {state.error && (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" /> {state.error}
          </div>
        )}
        <FormSection title="Pedido del cliente" description="Elige el cliente y pega el texto o sube una foto de la lista.">
          <div className="space-y-5">
            <Field label="Cliente" required>
              <SearchSelect value={clienteId} onValueChange={setClienteId} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
            </Field>
            <Field label="Texto del pedido">
              <Textarea name="texto" rows={3} placeholder="Ej. mándame 10 de tomate y 5 de cebolla" />
            </Field>
            <Field label="O una foto de la lista">
              <Input type="file" accept="image/*" onChange={onFile} />
            </Field>
          </div>
        </FormSection>
        <BtnInterpretar />
      </form>

      {p && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">Esto entendí</h3>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{p.resumen}</pre>
          {confState.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {confState.error}
            </div>
          )}
          {p.lineas.length > 0 ? (
            <form action={confAction} className="flex items-center justify-between gap-3">
              <input type="hidden" name="clienteId" value={state.clienteId ?? ""} />
              <input type="hidden" name="texto" value={state.texto ?? ""} />
              <input type="hidden" name="propuestaJson" value={JSON.stringify(p)} />
              <span className="text-sm text-muted-foreground">Total {money(p.total)}</span>
              <BtnConfirmar />
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">No se reconoció ningún producto del catálogo; ajusta el pedido e intenta de nuevo.</p>
          )}
        </div>
      )}
    </div>
  );
}
