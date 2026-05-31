"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarNotaCreditoAction, facturasConSaldoAction, type NotaCreditoState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2 } from "lucide-react";

interface Cliente { id: number; nombre: string }
interface FacturaSaldo { facturaId: number; numero: string; saldo: number }

const money = (n: number) => "$" + n.toLocaleString("es-CO");

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Crear nota crédito
    </Button>
  );
}

export function NotaCreditoForm({ clientes, hoy }: { clientes: Cliente[]; hoy: string }) {
  const [state, action] = useActionState<NotaCreditoState, FormData>(guardarNotaCreditoAction, {});
  const [clienteId, setClienteId] = useState("");
  const [facturas, setFacturas] = useState<FacturaSaldo[]>([]);
  const [facturaId, setFacturaId] = useState("");
  const [valor, setValor] = useState("");
  const [, startTransition] = useTransition();

  const saldoSel = facturas.find((f) => String(f.facturaId) === facturaId)?.saldo ?? 0;

  function elegirCliente(v: string) {
    setClienteId(v);
    setFacturaId("");
    setFacturas([]);
    startTransition(async () => {
      setFacturas(await facturasConSaldoAction(Number(v)));
    });
  }

  return (
    <form action={action} className="max-w-xl space-y-5">
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="facturaId" value={facturaId} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title="Nota crédito" description="Descuento o corrección sobre una factura con saldo. Reduce lo que te debe el cliente.">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <SearchSelect value={clienteId} onValueChange={elegirCliente} placeholder="Elige el cliente…" searchPlaceholder="Buscar cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
          </div>

          <div className="space-y-2">
            <Label>Factura</Label>
            {clienteId && facturas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este cliente no tiene facturas con saldo.</p>
            ) : (
              <SearchSelect
                value={facturaId}
                onValueChange={(v) => { setFacturaId(v); const s = facturas.find((f) => String(f.facturaId) === v)?.saldo ?? 0; setValor(String(s)); }}
                placeholder={clienteId ? "Elige la factura…" : "Primero elige el cliente"}
                disabled={!clienteId}
                options={facturas.map((f) => ({ value: String(f.facturaId), label: f.numero, hint: `saldo ${money(f.saldo)}` }))}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor</Label>
              <Input id="valor" name="valor" type="number" min="0" step="0.01" max={saldoSel || undefined} value={valor} onChange={(e) => setValor(e.target.value)} required className="tabular" />
              {saldoSel > 0 && <p className="text-xs text-muted-foreground">Máximo {money(saldoSel)}</p>}
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <DatePicker name="fecha" defaultValue={hoy} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" name="motivo" rows={2} required placeholder="Ej. descuento por producto en mal estado, error de precio…" />
          </div>
        </div>
      </FormSection>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/notas-credito" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
