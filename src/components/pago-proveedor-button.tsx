"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { calcularRetenciones, type RetencionConfig } from "@/lib/domain/retenciones";
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
  proveedor: string;
  facturaElectronica: boolean;
  retenciones: RetencionConfig[];
  action: (prev: State, form: FormData) => Promise<State>;
  cuentasOrigen: { id: number; nombre: string }[];
  beneficiarios: { id: number; banco: string; numeroCuenta: string; titularNit: string; titularNombre: string }[];
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export function PagoProveedorButton({
  cuentaId,
  saldo,
  hoy,
  proveedor,
  facturaElectronica,
  retenciones,
  action,
  cuentasOrigen,
  beneficiarios,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(saldo);
  const [destino, setDestino] = useState<string>("proveedor");
  const [state, formAction] = useActionState<State, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  const ret = useMemo(
    () => calcularRetenciones(Number.isFinite(valor) ? valor : 0, retenciones, facturaElectronica),
    [valor, retenciones, facturaElectronica],
  );
  const neto = Math.max(0, (Number.isFinite(valor) ? valor : 0) - ret.total);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Pagar
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Pago a ${proveedor}`}
        description={`Saldo pendiente: $${saldo.toLocaleString("es-CO")}`}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="cuentaId" value={cuentaId} />
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor del pago" required>
              <Input
                name="valor"
                type="number"
                min="0"
                step="0.01"
                value={Number.isFinite(valor) ? valor : ""}
                onChange={(e) => setValor(e.target.valueAsNumber)}
                required
              />
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

          <Field label="Cuenta de origen (de dónde sale)" required>
            <SearchSelect
              name="cuentaOrigenId"
              placeholder="Elige la cuenta"
              options={cuentasOrigen.map((c) => ({ value: String(c.id), label: c.nombre }))}
            />
          </Field>

          <Field label="Beneficiario (a quién se paga)" required>
            <SearchSelect
              name="destino"
              defaultValue="proveedor"
              onValueChange={setDestino}
              options={[
                { value: "proveedor", label: `Al proveedor (${proveedor})` },
                ...beneficiarios.map((b) => ({ value: `cuenta:${b.id}`, label: `${b.titularNombre} · ${b.banco} ${b.numeroCuenta}` })),
                { value: "adhoc", label: "+ Otro beneficiario…" },
              ]}
            />
          </Field>

          {destino === "adhoc" && (
            <div className="grid gap-4 sm:grid-cols-2 rounded-lg border p-3">
              <Field label="Banco" required><Input name="adhocBanco" maxLength={100} /></Field>
              <Field label="N° de cuenta" required><Input name="adhocCuenta" maxLength={50} /></Field>
              <Field label="NIT titular" required><Input name="adhocNit" maxLength={50} /></Field>
              <Field label="Nombre titular" required><Input name="adhocNombre" maxLength={200} /></Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="guardarBeneficiario" value="true" /> Guardar este beneficiario para futuros pagos
              </label>
            </div>
          )}

          <input type="hidden" name="beneficiariosJson" value={JSON.stringify(beneficiarios)} />

          {facturaElectronica && ret.detalle.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium">Retenciones aplicadas</p>
              <ul className="space-y-1">
                {ret.detalle.map((d) => (
                  <li key={d.retencionId} className="flex justify-between text-muted-foreground">
                    <span>{d.nombre} ({d.porcentaje}%)</span>
                    <span className="tabular">− {money(d.valor)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                <span>Neto a desembolsar</span>
                <span className="tabular">{money(neto)}</span>
              </div>
            </div>
          )}
          {facturaElectronica && ret.detalle.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Proveedor con factura electrónica: no hay retenciones aplicables a este valor.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar label="Registrar pago" />
          </div>
        </form>
      </Modal>
    </>
  );
}
