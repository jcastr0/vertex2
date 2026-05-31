"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { agregarBeneficiarioAction, quitarBeneficiarioAction, type BeneficiarioState } from "./beneficiarios-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { SearchSelect, type OpcionSelect } from "@/components/ui/search-select";
import { Loader2, Trash2, Plus } from "lucide-react";

interface Cuenta { id: number; banco: string; tipo: string; numeroCuenta: string; titularNit: string; titularNombre: string }
interface Props { terceroId: number; terceroNit: string; terceroNombre: string; cuentas: Cuenta[]; bancos: OpcionSelect[] }

function AgregarBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Agregar cuenta
    </Button>
  );
}

export function BeneficiariosPanel({ terceroId, terceroNit, terceroNombre, cuentas, bancos }: Props) {
  const router = useRouter();
  const action = agregarBeneficiarioAction.bind(null, terceroId);
  const [state, formAction] = useActionState<BeneficiarioState, FormData>(action, {});
  // Por defecto la cuenta es del mismo proveedor (no se repite NIT ni nombre).
  const [esPropia, setEsPropia] = useState(true);

  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <h3 className="text-sm font-semibold tracking-tight">Cuentas de pago</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Cuentas a las que le pagas a este proveedor.</p>
      </div>

      <div className="space-y-4 p-5">
        {cuentas.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {cuentas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{c.banco} {c.numeroCuenta}</span>
                  <span className="text-muted-foreground"> · {c.titularNombre} · NIT {c.titularNit}</span>
                </span>
                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" title="Quitar cuenta" onClick={async () => { await quitarBeneficiarioAction(terceroId, c.id); router.refresh(); }}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form action={formAction} className="space-y-3">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <input type="hidden" name="esPropia" value={String(esPropia)} />
          <input type="hidden" name="terceroNit" value={terceroNit} />
          <input type="hidden" name="terceroNombre" value={terceroNombre} />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <Field label="Banco" required>
              <SearchSelect name="banco" options={bancos} placeholder="Elige el banco…" searchPlaceholder="Buscar banco…" />
            </Field>
            <Field label="Tipo" required>
              <SearchSelect name="tipo" defaultValue="ahorros" options={[{ value: "ahorros", label: "Ahorros" }, { value: "corriente", label: "Corriente" }]} />
            </Field>
            <Field label="N° de cuenta" required><Input name="numeroCuenta" maxLength={50} required /></Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">La cuenta es del mismo proveedor</p>
              <p className="text-xs text-muted-foreground">{terceroNombre} · NIT {terceroNit}</p>
            </div>
            <Switch checked={esPropia} onCheckedChange={setEsPropia} />
          </div>

          {!esPropia && (
            <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
              <p className="text-xs text-muted-foreground sm:col-span-2">¿A nombre de quién está la cuenta? (factoring, cesión…)</p>
              <Field label="NIT del titular" required><Input name="titularNit" maxLength={50} /></Field>
              <Field label="Nombre del titular" required><Input name="titularNombre" maxLength={200} /></Field>
            </div>
          )}

          <AgregarBtn />
        </form>
      </div>
    </section>
  );
}
