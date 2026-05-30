"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarRetencionAction, type RetencionState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  retencion?: {
    id: number;
    nombre: string;
    porcentaje: string;
    baseMinima: string;
    aplicaTodas: boolean;
    activa: boolean;
  };
}

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Guardar
    </Button>
  );
}

export function RetencionForm({ retencion }: Props) {
  const [state, action] = useActionState<RetencionState, FormData>(guardarRetencionAction, {});
  const [aplicaTodas, setAplicaTodas] = useState(retencion?.aplicaTodas ?? true);
  const [activa, setActiva] = useState(retencion?.activa ?? true);

  return (
    <form action={action} className="max-w-xl space-y-6">
      {retencion && <input type="hidden" name="id" value={retencion.id} />}
      <input type="hidden" name="aplicaTodas" value={String(aplicaTodas)} />
      <input type="hidden" name="activa" value={String(activa)} />

      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={retencion?.nombre}
          required
          maxLength={100}
          placeholder="Ej. Retefuente compras"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="porcentaje">Porcentaje (%)</Label>
          <Input
            id="porcentaje"
            name="porcentaje"
            type="number"
            step="0.001"
            min="0"
            max="100"
            defaultValue={retencion?.porcentaje ?? ""}
            required
            placeholder="2.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseMinima">Base mínima ($)</Label>
          <Input
            id="baseMinima"
            name="baseMinima"
            type="number"
            step="0.01"
            min="0"
            defaultValue={retencion?.baseMinima ?? "0"}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">Solo aplica cuando el pago iguala o supera este monto.</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label className="cursor-pointer" onClick={() => setAplicaTodas((v) => !v)}>
            Aplica a todas las facturas electrónicas
          </Label>
          <p className="text-xs text-muted-foreground">
            Se descuenta en cada pago a proveedores con factura electrónica.
          </p>
        </div>
        <Switch checked={aplicaTodas} onCheckedChange={setAplicaTodas} />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label className="cursor-pointer" onClick={() => setActiva((v) => !v)}>
            Activa
          </Label>
          <p className="text-xs text-muted-foreground">Las retenciones inactivas no se aplican en los pagos.</p>
        </div>
        <Switch checked={activa} onCheckedChange={setActiva} />
      </div>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/retenciones" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
