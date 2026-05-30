"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { recaudarRutaAction, marcarVisitaAction, type RutaState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { Badge } from "@/components/ui/badge";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { RESULTADOS_VISITA } from "@/lib/domain/ruta-recaudo";
import { AlertCircle, Loader2, Phone, MapPin, HandCoins, CircleX, Camera } from "lucide-react";

interface Parada {
  clienteId: number;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  celular: string | null;
  saldo: number;
  diasVencido: number;
  resultadoHoy: string | null;
}

const money = (n: number) => "$" + n.toLocaleString("es-CO");
const ETIQUETA_RES: Record<string, string> = Object.fromEntries(RESULTADOS_VISITA.map((r) => [r.value, r.label]));

function Enviar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function ParadaCard({ parada, recaudadorId, hoy }: { parada: Parada; recaudadorId: number; hoy: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "recaudar" | "marcar">(null);
  const [recaudarState, recaudarAction] = useActionState<RutaState, FormData>(recaudarRutaAction, {});
  const [marcarState, marcarAction] = useActionState<RutaState, FormData>(marcarVisitaAction, {});
  const [resultado, setResultado] = useState("no_estaba");
  const tel = parada.celular || parada.telefono;

  useEffect(() => {
    if (recaudarState.ok || marcarState.ok) {
      setModal(null);
      router.refresh();
    }
  }, [recaudarState.ok, marcarState.ok, router]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{parada.nombre}</span>
            {parada.diasVencido > 0 && (
              <Badge variant="destructive" className="font-normal">Vencido {parada.diasVencido}d</Badge>
            )}
            {parada.resultadoHoy && (
              <Badge variant="secondary" className="font-normal">Hoy: {ETIQUETA_RES[parada.resultadoHoy] ?? parada.resultadoHoy}</Badge>
            )}
          </div>
          {(parada.direccion || parada.ciudad) && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{[parada.direccion, parada.ciudad].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted-foreground">Saldo</div>
          <div className="tabular text-lg font-bold">{money(parada.saldo)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tel && (
          <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            <Phone className="size-4" /> {tel}
          </a>
        )}
        <Button size="sm" onClick={() => setModal("recaudar")}>
          <HandCoins className="size-4" /> Recaudar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setModal("marcar")}>
          <CircleX className="size-4" /> No le pagaron
        </Button>
      </div>

      {/* Modal recaudar */}
      <Modal open={modal === "recaudar"} onOpenChange={(o) => setModal(o ? "recaudar" : null)} title={`Recaudar a ${parada.nombre}`} description={`Saldo pendiente: ${money(parada.saldo)}`}>
        <form action={recaudarAction} className="space-y-4">
          <input type="hidden" name="clienteId" value={parada.clienteId} />
          <input type="hidden" name="recaudadorId" value={recaudadorId} />
          <input type="hidden" name="fecha" value={hoy} />
          {recaudarState.error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {recaudarState.error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" required>
              <Input name="valor" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={parada.saldo} required />
            </Field>
            <Field label="Método" required>
              <SearchSelect name="metodoPago" defaultValue="efectivo" options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))} />
            </Field>
          </div>
          <Field label="Referencia" hint="N° de recibo, transferencia, etc.">
            <Input name="referencia" maxLength={100} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Enviar>Registrar recaudo</Enviar>
          </div>
        </form>
      </Modal>

      {/* Modal no le pagaron + foto */}
      <Modal open={modal === "marcar"} onOpenChange={(o) => setModal(o ? "marcar" : null)} title={`Visita a ${parada.nombre}`} description="Registra que fuiste pero no te pagaron.">
        <form action={marcarAction} className="space-y-4">
          <input type="hidden" name="clienteId" value={parada.clienteId} />
          <input type="hidden" name="recaudadorId" value={recaudadorId} />
          <input type="hidden" name="fecha" value={hoy} />
          <input type="hidden" name="resultado" value={resultado} />
          {marcarState.error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {marcarState.error}
            </div>
          )}
          <Field label="¿Qué pasó?">
            <div className="grid grid-cols-2 gap-3">
              {["no_estaba", "no_quiso"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResultado(r)}
                  className={`h-11 rounded-lg border text-sm font-medium ${resultado === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                >
                  {ETIQUETA_RES[r]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Foto de evidencia (opcional)" hint="Toma una foto del local o la fachada.">
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted">
              <Camera className="size-5" />
              <span>Tomar / elegir foto</span>
              <input type="file" name="foto" accept="image/*" capture="environment" className="sr-only" />
            </label>
          </Field>
          <Field label="Observaciones">
            <Textarea name="observaciones" rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Enviar>Guardar visita</Enviar>
          </div>
        </form>
      </Modal>
    </div>
  );
}
