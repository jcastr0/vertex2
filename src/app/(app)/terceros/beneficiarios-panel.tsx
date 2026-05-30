"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { agregarBeneficiarioAction, quitarBeneficiarioAction, type BeneficiarioState } from "./beneficiarios-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { Trash2 } from "lucide-react";

interface Cuenta { id: number; banco: string; tipo: string; numeroCuenta: string; titularNit: string; titularNombre: string }
interface Props { terceroId: number; cuentas: Cuenta[] }

export function BeneficiariosPanel({ terceroId, cuentas }: Props) {
  const router = useRouter();
  const action = agregarBeneficiarioAction.bind(null, terceroId);
  const [state, formAction] = useActionState<BeneficiarioState, FormData>(action, {});

  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">Cuentas de pago</h3>
      <p className="text-sm text-muted-foreground">Cuentas a las que se le paga a este proveedor (pueden tener NIT distinto).</p>
      {cuentas.length > 0 && (
        <ul className="divide-y text-sm">
          {cuentas.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>{c.titularNombre} · {c.banco} {c.numeroCuenta} · NIT {c.titularNit}</span>
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={async () => { await quitarBeneficiarioAction(terceroId, c.id); router.refresh(); }}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        {state.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
        <Field label="Banco" required><Input name="banco" maxLength={100} required /></Field>
        <Field label="Tipo" required>
          <SearchSelect name="tipo" defaultValue="ahorros" options={[{ value: "ahorros", label: "Ahorros" }, { value: "corriente", label: "Corriente" }]} />
        </Field>
        <Field label="N° de cuenta" required><Input name="numeroCuenta" maxLength={50} required /></Field>
        <Field label="NIT titular" required><Input name="titularNit" maxLength={50} required /></Field>
        <Field label="Nombre titular" required><Input name="titularNombre" maxLength={200} required /></Field>
        <div className="sm:col-span-2"><Button type="submit" variant="outline">Agregar cuenta</Button></div>
      </form>
    </section>
  );
}
