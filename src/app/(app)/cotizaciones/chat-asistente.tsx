"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { enviarMensajeAction, confirmarPedidoAction, type TurnoState, type ConfirmarState } from "./asistente-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Field } from "@/components/ui/field";
import { AlertCircle, Loader2, Send, ShieldQuestion, Sparkles } from "lucide-react";

interface Opt { id: number; nombre: string }
type Burbuja = { de: "cliente" | "bot"; texto: string };
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending} aria-label="Enviar">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
    </Button>
  );
}

export function ChatAsistente({ clientes, mensajeNoRegistrado }: { clientes: Opt[]; mensajeNoRegistrado: string }) {
  const [state, action] = useActionState<TurnoState, FormData>(enviarMensajeAction, {});
  const [, confAction] = useActionState<ConfirmarState, FormData>(confirmarPedidoAction, {});
  const [clienteId, setClienteId] = useState("");
  const [imagenDataUrl, setImagenDataUrl] = useState("");
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [borrador, setBorrador] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [propuesta, setPropuesta] = useState<TurnoState["propuesta"]>();
  const [completo, setCompleto] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.mensajeAsistente) {
      setBurbujas((b) => [...b, { de: "bot", texto: state.mensajeAsistente! }]);
      setPropuesta(state.propuesta);
      setCompleto(!!state.completo);
      setBorrador(!state.completo && state.propuesta ? state.propuesta.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })) : []);
    }
  }, [state]);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [burbujas]);

  function onSubmitTexto(form: FormData) {
    const t = String(form.get("texto") || "").trim();
    if (t) setBurbujas((b) => [...b, { de: "cliente", texto: t }]);
    return action(form);
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return setImagenDataUrl("");
    const r = new FileReader();
    r.onload = () => setImagenDataUrl(String(r.result || ""));
    r.readAsDataURL(f);
  }
  function simularNoRegistrado() {
    setBurbujas((b) => [...b, { de: "cliente", texto: "(número no registrado)" }, { de: "bot", texto: mensajeNoRegistrado }]);
    setPropuesta(undefined);
    setCompleto(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cliente (registrado)" required>
          <div className="w-64">
            <SearchSelect value={clienteId} onValueChange={setClienteId} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
          </div>
        </Field>
        <Button type="button" variant="outline" size="sm" onClick={simularNoRegistrado}>
          <ShieldQuestion className="size-4" /> Simular no registrado
        </Button>
      </div>

      <div className="h-96 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-4">
        {burbujas.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" /> Escribe como si fueras el cliente: «mándame 10 de tomate» o «lo mismo de la vez pasada».
          </p>
        )}
        {burbujas.map((b, i) => (
          <div key={i} className={b.de === "cliente" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${b.de === "cliente" ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>{b.texto}</div>
          </div>
        ))}
        <div ref={fin} />
      </div>

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {state.error}
        </div>
      )}

      {completo && propuesta && propuesta.lineas.length > 0 && (
        <form action={confAction} className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <input type="hidden" name="clienteId" value={state.clienteId ?? ""} />
          <input type="hidden" name="texto" value="" />
          <input type="hidden" name="propuestaJson" value={JSON.stringify(propuesta)} />
          <span className="text-sm">Pedido listo · <span className="tabular font-semibold">{money(propuesta.total)}</span></span>
          <Button type="submit">Confirmar y crear cotización</Button>
        </form>
      )}

      <form action={onSubmitTexto} className="flex items-end gap-2">
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="imagenDataUrl" value={imagenDataUrl} />
        <input type="hidden" name="borradorJson" value={JSON.stringify(borrador)} />
        <div className="flex-1">
          <Input name="texto" placeholder="Escribe el pedido del cliente…" autoComplete="off" />
        </div>
        <Input type="file" accept="image/*" onChange={onFile} className="w-40" />
        <Enviar />
      </form>
    </div>
  );
}
