"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { pagarProveedorAction, beneficiariosProveedorAction, type PagoState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { METODOS_PAGO } from "@/lib/domain/cartera";
import { calcularRetenciones, type RetencionConfig } from "@/lib/domain/retenciones";
import { PagarDoc } from "./pagar-doc";
import { AlertCircle, Loader2, ChevronDown, Wallet } from "lucide-react";

interface Doc { id: number; numero: string; fecha: string; vence: string; total: number; saldo: number }
interface Props {
  proveedorId: number;
  proveedor: string;
  total: number;
  vencido: boolean;
  facturaElectronica: boolean;
  hoy: string;
  cuentasOrigen: { id: number; nombre: string }[];
  retenciones: RetencionConfig[];
  docs: Doc[];
}

type Beneficiario = {
  id: number;
  banco: string;
  numeroCuenta: string;
  titularNit: string;
  titularNombre: string;
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
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

export function PagarProveedor({
  proveedorId,
  proveedor,
  total,
  vencido,
  facturaElectronica,
  hoy,
  cuentasOrigen,
  retenciones,
  docs,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState(total);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);

  const action = pagarProveedorAction.bind(null, proveedorId);
  const [state, formAction] = useActionState<PagoState, FormData>(action, {});

  // Load saved beneficiaries when modal opens
  useEffect(() => {
    if (!open) return;
    beneficiariosProveedorAction(proveedorId).then((b) => setBeneficiarios(b));
  }, [open, proveedorId]);

  // Close and refresh after success
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  const ret = useMemo(
    () => calcularRetenciones(Number.isFinite(monto) ? monto : 0, retenciones, facturaElectronica),
    [monto, retenciones, facturaElectronica],
  );
  const neto = Math.max(0, (Number.isFinite(monto) ? monto : 0) - ret.total);

  const beneficiarioOpciones = [
    { value: "proveedor", label: `Al proveedor (${proveedor})` },
    ...beneficiarios.map((b) => ({
      value: `cuenta:${b.id}`,
      label: `${b.titularNombre} · ${b.banco} ${b.numeroCuenta}`,
    })),
  ];

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-destructive/40">
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className={`size-2.5 shrink-0 rounded-full ${vencido ? "bg-destructive" : "bg-primary/40"}`} title={vencido ? "Vencido" : "Al día"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{proveedor}</span>
              <span className="text-sm text-muted-foreground">{docs.length} {docs.length === 1 ? "factura" : "facturas"}{facturaElectronica ? " · F.E." : ""}{vencido ? " · tiene vencido" : ""}</span>
            </span>
            <span className="tabular text-lg font-bold tracking-tight">{money(total)}</span>
            <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`} />
          </button>
          <Button type="button" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            <Wallet className="size-4" /> Pagar
          </Button>
        </div>

        {abierto && docs.length > 0 && (
          <ul className="divide-y divide-border border-t border-border bg-muted/20 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{d.numero}</span>
                  <span className="text-muted-foreground"> · {fmtFecha(d.fecha)}</span>
                </span>
                <span className={`hidden shrink-0 text-xs sm:inline ${d.vence < hoy ? "font-medium text-destructive" : "text-muted-foreground"}`}>vence {fmtFecha(d.vence)}</span>
                <span className="tabular w-20 shrink-0 text-right font-medium sm:w-24">{money(d.saldo)}</span>
                <PagarDoc
                  cxpId={d.id}
                  numero={d.numero}
                  saldo={d.saldo}
                  hoy={hoy}
                  facturaElectronica={facturaElectronica}
                  cuentasOrigen={cuentasOrigen}
                  retenciones={retenciones}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`¿Cuánto le pagaste a ${proveedor}?`}
        description={`Le debes ${money(total)}`}
      >
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}

          <Field label="Monto" required>
            <Input
              name="monto"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={Number.isFinite(monto) ? monto : ""}
              onChange={(e) => setMonto(e.target.valueAsNumber)}
              required
              className="h-12 text-lg tabular"
              autoFocus
            />
          </Field>

          <Field label="¿De qué cuenta sale?" required>
            <SearchSelect
              name="cuentaOrigenId"
              placeholder="Elige la cuenta"
              options={cuentasOrigen.map((c) => ({ value: String(c.id), label: c.nombre }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="¿Cómo pagaste?" required>
              <SearchSelect
                name="metodoPago"
                defaultValue="efectivo"
                options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))}
              />
            </Field>
            <Field label="Fecha">
              <DatePicker name="fecha" defaultValue={hoy} />
            </Field>
          </div>

          {/* Beneficiary selector — only for FE suppliers */}
          {facturaElectronica && (
            <Field label="¿A quién le pagas?" required>
              <SearchSelect
                name="destino"
                defaultValue="proveedor"
                options={beneficiarioOpciones}
              />
            </Field>
          )}

          {/* Hidden field so pagarProveedorAction can resolve the beneficiary */}
          <input type="hidden" name="beneficiariosJson" value={JSON.stringify(beneficiarios)} />

          {/* Retención breakdown — only for FE suppliers */}
          {facturaElectronica && ret.detalle.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium">Retenciones aplicadas</p>
              <ul className="space-y-1">
                {ret.detalle.map((d) => (
                  <li key={d.retencionId} className="flex justify-between text-muted-foreground">
                    <span>
                      {d.nombre} ({d.porcentaje}%)
                    </span>
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

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="h-12" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}
